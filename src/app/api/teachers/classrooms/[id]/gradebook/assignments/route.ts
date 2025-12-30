import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AssignmentType } from "@prisma/client";
import {
  errorResponse,
  getAuthenticatedUser,
  getRequestId,
  isTeacherOfClassroom,
} from "@/lib/api-utils";
import { getEffectiveDeadline, isAssignmentOverdue } from "@/lib/grades/assignmentDeadline";
import { join, sqltag as sql } from "@prisma/client/runtime/library";

const querySchema = z.object({
  search: z.string().max(200).default(""),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(50).default(10),
});

type AssignmentSummary = {
  id: string;
  title: string;
  type: string;
  dueDate: string | null;
  stats: {
    totalStudents: number;
    submittedCount: number;
    gradedCount: number;
    pendingCount: number;
    overdueMissingCount: number;
    averageGrade: number | null;
    highest: number | null;
    lowest: number | null;
  };
};

type LatestRow = {
  studentId: string;
  assignmentId: string;
  grade: number | null;
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const requestId = getRequestId(req);
  try {
    const classroomId = params.id;
    if (!classroomId) {
      return errorResponse(400, "classroomId is required", { requestId });
    }

    const user = await getAuthenticatedUser(req);
    if (!user) return errorResponse(401, "Unauthorized", { requestId });
    if (user.role !== "TEACHER") return errorResponse(403, "Forbidden", { requestId });

    const owns = await isTeacherOfClassroom(user.id, classroomId);
    if (!owns) {
      return errorResponse(403, "Forbidden - Not your classroom", { requestId });
    }

    const { searchParams } = new URL(req.url);
    const parsed = querySchema.safeParse({
      search: searchParams.get("search") || undefined,
      page: searchParams.get("page") || undefined,
      pageSize: searchParams.get("pageSize") || undefined,
    });

    if (!parsed.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ", {
        requestId,
        details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      });
    }

    const search = parsed.data.search.trim();
    const normalizedType = search.trim().toUpperCase();
    const typeFilter = (Object.values(AssignmentType) as string[]).includes(normalizedType)
      ? (normalizedType as AssignmentType)
      : null;
    const page = parsed.data.page;
    const pageSize = parsed.data.pageSize;
    const offset = (page - 1) * pageSize;

    const assignmentWhere = {
      classroomId,
      ...(search
        ? {
            assignment: {
              is: {
                OR: [
                  { title: { contains: search, mode: "insensitive" as const } },
                  ...(typeFilter ? [{ type: typeFilter }] : []),
                ],
              },
            },
          }
        : {}),
    };

    const [totalStudents, totalAssignments, assignmentRows] = await Promise.all([
      prisma.classroomStudent.count({ where: { classroomId } }),
      prisma.assignmentClassroom.count({ where: assignmentWhere }),
      prisma.assignmentClassroom.findMany({
        where: assignmentWhere,
        select: {
          addedAt: true,
          assignment: { select: { id: true, title: true, type: true, dueDate: true, lockAt: true } },
        },
        orderBy: { addedAt: "desc" },
        take: pageSize,
        skip: offset,
      }),
    ]);

    const assignments = assignmentRows.map((r) => r.assignment);
    const assignmentIds = assignments.map((a) => a.id);

    let latestRows: LatestRow[] = [];
    if (assignmentIds.length > 0) {
      latestRows = (await prisma.$queryRaw(
        sql`
          SELECT DISTINCT ON (s."studentId", s."assignmentId")
            s."studentId" as "studentId",
            s."assignmentId" as "assignmentId",
            s.grade as "grade"
          FROM "assignment_submissions" s
          JOIN "classroom_students" cs
            ON cs."studentId" = s."studentId" AND cs."classroomId" = ${classroomId}
          WHERE s."assignmentId" IN (${join(assignmentIds)})
          ORDER BY s."studentId", s."assignmentId", s.attempt DESC
        `
      )) as unknown as LatestRow[];
    }

    const aggByAssignment = new Map<
      string,
      {
        submittedCount: number;
        gradedCount: number;
        pendingCount: number;
        sumGrades: number;
        highest: number | null;
        lowest: number | null;
      }
    >();

    for (const aid of assignmentIds) {
      aggByAssignment.set(aid, {
        submittedCount: 0,
        gradedCount: 0,
        pendingCount: 0,
        sumGrades: 0,
        highest: null,
        lowest: null,
      });
    }

    for (const row of latestRows) {
      const agg = aggByAssignment.get(row.assignmentId);
      if (!agg) continue;
      agg.submittedCount += 1;
      if (row.grade !== null) {
        agg.gradedCount += 1;
        agg.sumGrades += row.grade;
        agg.highest = agg.highest === null ? row.grade : Math.max(agg.highest, row.grade);
        agg.lowest = agg.lowest === null ? row.grade : Math.min(agg.lowest, row.grade);
      } else {
        agg.pendingCount += 1;
      }
    }

    const now = new Date();

    const result: AssignmentSummary[] = assignments.map((a) => {
      const agg = aggByAssignment.get(a.id) ?? {
        submittedCount: 0,
        gradedCount: 0,
        pendingCount: 0,
        sumGrades: 0,
        highest: null,
        lowest: null,
      };

      const deadline = getEffectiveDeadline(a);
      const dueDate = deadline ? deadline.toISOString() : null;
      const isOverdue = isAssignmentOverdue({ dueDate: a.dueDate, lockAt: a.lockAt }, now);
      const overdueMissingCount = isOverdue ? Math.max(0, totalStudents - agg.submittedCount) : 0;

      const denom = agg.gradedCount + overdueMissingCount;
      const averageGrade = denom > 0 ? round1(agg.sumGrades / denom) : null;

      const resolvedHighest =
        denom > 0
          ? agg.highest !== null
            ? round1(agg.highest)
            : overdueMissingCount > 0
            ? 0
            : null
          : null;

      const resolvedLowest = denom > 0 ? (overdueMissingCount > 0 ? 0 : agg.lowest !== null ? round1(agg.lowest) : null) : null;

      return {
        id: a.id,
        title: a.title,
        type: a.type,
        dueDate,
        stats: {
          totalStudents,
          submittedCount: agg.submittedCount,
          gradedCount: agg.gradedCount + overdueMissingCount,
          pendingCount: agg.pendingCount,
          overdueMissingCount,
          averageGrade,
          highest: resolvedHighest,
          lowest: resolvedLowest,
        },
      };
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          assignments: result,
          pagination: {
            page,
            pageSize,
            total: totalAssignments,
            totalPages: Math.max(1, Math.ceil(totalAssignments / pageSize)),
          },
        },
        requestId,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error(
      `[ERROR] [GET] /api/teachers/classrooms/${params.id}/gradebook/assignments {requestId:${requestId}}`,
      error
    );
    return errorResponse(500, "Internal server error", { requestId });
  }
}
