import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  errorResponse,
  getAuthenticatedUser,
  getRequestId,
  isTeacherOfClassroom,
} from "@/lib/api-utils";
import { isAssignmentOverdue } from "@/lib/grades/assignmentDeadline";
import { join, sqltag as sql } from "@prisma/client/runtime/library";

const querySchema = z.object({
  search: z.string().max(200).default(""),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(50).default(10),
});

type StudentSummary = {
  id: string;
  fullname: string;
  email: string;
  stats: {
    totalAssignments: number;
    submittedCount: number;
    gradedCount: number;
    overdueMissingCount: number;
    averageGrade: number | null;
  };
};

type OverviewStats = {
  totalStudents: number;
  totalAssignments: number;
  submissionRate: number;
  averageGrade: number | null;
  highest: number | null;
  lowest: number | null;
  overdueMissing: number;
};

type LatestSubmissionRow = {
  studentId: string;
  assignmentId: string;
  grade: number | null;
  submittedAt: Date | null;
};

type OverviewRow = {
  totalStudents: number;
  totalAssignments: number;
  submittedPairs: number;
  gradedPairs: number;
  pendingPairs: number;
  overdueAssignments: number;
  overdueMissingPairs: number;
  sumGrades: number;
  highest: number | null;
  lowest: number | null;
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
    const page = parsed.data.page;
    const pageSize = parsed.data.pageSize;
    const offset = (page - 1) * pageSize;

    const studentWhere = {
      classroomId,
      ...(search
        ? {
            student: {
              OR: [
                { fullname: { contains: search, mode: "insensitive" as const } },
                { email: { contains: search, mode: "insensitive" as const } },
              ],
            },
          }
        : {}),
    };

    const [totalFilteredStudents, studentsRows, assignmentRows] = await Promise.all([
      prisma.classroomStudent.count({ where: studentWhere }),
      prisma.classroomStudent.findMany({
        where: studentWhere,
        select: {
          student: { select: { id: true, fullname: true, email: true } },
        },
        orderBy: [{ student: { fullname: "asc" } }, { student: { email: "asc" } }],
        take: pageSize,
        skip: offset,
      }),
      prisma.assignmentClassroom.findMany({
        where: { classroomId },
        select: {
          assignment: { select: { id: true, dueDate: true, lockAt: true } },
        },
      }),
    ]);

    const assignments = assignmentRows.map((r) => r.assignment);
    const totalAssignments = assignments.length;

    const now = new Date();
    const overdueAssignmentIds = new Set<string>();
    for (const a of assignments) {
      if (isAssignmentOverdue(a, now)) overdueAssignmentIds.add(a.id);
    }

    const students = studentsRows.map((r) => {
      const s = r.student;
      const fullname = s.fullname?.trim() || s.email.split("@")[0] || "Học sinh";
      return { id: s.id, fullname, email: s.email };
    });

    const studentIds = students.map((s) => s.id);
    const assignmentIds = assignments.map((a) => a.id);

    let latestRows: LatestSubmissionRow[] = [];
    if (studentIds.length && assignmentIds.length) {
      latestRows = (await prisma.$queryRaw(
        sql`
          SELECT DISTINCT ON (s."studentId", s."assignmentId")
            s."studentId" as "studentId",
            s."assignmentId" as "assignmentId",
            s.grade as "grade",
            s."submittedAt" as "submittedAt"
          FROM "assignment_submissions" s
          WHERE s."studentId" IN (${join(studentIds)})
            AND s."assignmentId" IN (${join(assignmentIds)})
          ORDER BY s."studentId", s."assignmentId", s.attempt DESC
        `
      )) as unknown as LatestSubmissionRow[];
    }

    const byStudent = new Map<
      string,
      {
        submittedSet: Set<string>;
        gradedCount: number;
        sumGrades: number;
      }
    >();

    for (const sid of studentIds) {
      byStudent.set(sid, { submittedSet: new Set(), gradedCount: 0, sumGrades: 0 });
    }

    for (const r of latestRows) {
      const stats = byStudent.get(r.studentId);
      if (!stats) continue;
      stats.submittedSet.add(r.assignmentId);
      if (r.grade !== null) {
        stats.gradedCount += 1;
        stats.sumGrades += r.grade;
      }
    }

    const summaries: StudentSummary[] = students.map((s) => {
      const stats = byStudent.get(s.id) ?? { submittedSet: new Set<string>(), gradedCount: 0, sumGrades: 0 };
      let overdueMissingCount = 0;
      if (overdueAssignmentIds.size > 0) {
        overdueAssignmentIds.forEach((aid) => {
          if (!stats.submittedSet.has(aid)) overdueMissingCount += 1;
        });
      }
      const denom = stats.gradedCount + overdueMissingCount;
      const averageGrade = denom > 0 ? round1(stats.sumGrades / denom) : null;

      return {
        id: s.id,
        fullname: s.fullname,
        email: s.email,
        stats: {
          totalAssignments,
          submittedCount: stats.submittedSet.size,
          gradedCount: stats.gradedCount,
          overdueMissingCount,
          averageGrade,
        },
      };
    });

    const overviewRows = (await prisma.$queryRaw(
      sql`
        WITH students AS (
          SELECT cs."studentId" as "studentId"
          FROM "classroom_students" cs
          WHERE cs."classroomId" = ${classroomId}
        ),
        assignments AS (
          SELECT a.id as "assignmentId", COALESCE(a."lockAt", a."dueDate") as "deadline"
          FROM "assignment_classrooms" ac
          JOIN "assignments" a ON a.id = ac."assignmentId"
          WHERE ac."classroomId" = ${classroomId}
        ),
        overdue_assignments AS (
          SELECT "assignmentId"
          FROM assignments
          WHERE "deadline" IS NOT NULL AND "deadline" < ${now}
        ),
        latest AS (
          SELECT DISTINCT ON (s."studentId", s."assignmentId")
            s."studentId" as "studentId",
            s."assignmentId" as "assignmentId",
            s.grade as "grade"
          FROM "assignment_submissions" s
          JOIN students cs ON cs."studentId" = s."studentId"
          JOIN assignments a ON a."assignmentId" = s."assignmentId"
          ORDER BY s."studentId", s."assignmentId", s.attempt DESC
        ),
        agg AS (
          SELECT
            COUNT(*)::int as "submittedPairs",
            COUNT(*) FILTER (WHERE grade IS NOT NULL)::int as "gradedPairs",
            COUNT(*) FILTER (WHERE grade IS NULL)::int as "pendingPairs",
            COALESCE(SUM(grade) FILTER (WHERE grade IS NOT NULL), 0) as "sumGrades",
            MAX(grade) FILTER (WHERE grade IS NOT NULL) as "highest",
            MIN(grade) FILTER (WHERE grade IS NOT NULL) as "lowest"
          FROM latest
        ),
        counts AS (
          SELECT
            (SELECT COUNT(*)::int FROM students) as "totalStudents",
            (SELECT COUNT(*)::int FROM assignments) as "totalAssignments",
            (SELECT COUNT(*)::int FROM overdue_assignments) as "overdueAssignments",
            (SELECT COUNT(*)::int FROM latest l JOIN overdue_assignments oa ON oa."assignmentId" = l."assignmentId") as "overdueSubmittedPairs"
        )
        SELECT
          counts."totalStudents" as "totalStudents",
          counts."totalAssignments" as "totalAssignments",
          agg."submittedPairs" as "submittedPairs",
          agg."gradedPairs" as "gradedPairs",
          agg."pendingPairs" as "pendingPairs",
          counts."overdueAssignments" as "overdueAssignments",
          GREATEST(0, counts."overdueAssignments" * counts."totalStudents" - counts."overdueSubmittedPairs")::int as "overdueMissingPairs",
          agg."sumGrades" as "sumGrades",
          agg."highest" as "highest",
          agg."lowest" as "lowest"
        FROM counts, agg
      `
    )) as unknown as OverviewRow[];

    const overviewRow =
      overviewRows[0] ??
      ({
        totalStudents: 0,
        totalAssignments: 0,
        submittedPairs: 0,
        gradedPairs: 0,
        pendingPairs: 0,
        overdueAssignments: 0,
        overdueMissingPairs: 0,
        sumGrades: 0,
        highest: null,
        lowest: null,
      } satisfies OverviewRow);

    const denom = overviewRow.gradedPairs + overviewRow.overdueMissingPairs;
    const averageGrade = denom > 0 ? round1(overviewRow.sumGrades / denom) : null;

    const resolvedHighest =
      denom > 0
        ? overviewRow.highest !== null
          ? round1(overviewRow.highest)
          : overviewRow.overdueMissingPairs > 0
          ? 0
          : null
        : null;

    const resolvedLowest = denom > 0 ? (overviewRow.overdueMissingPairs > 0 ? 0 : overviewRow.lowest !== null ? round1(overviewRow.lowest) : null) : null;

    const submissionDenom = overviewRow.totalStudents * overviewRow.totalAssignments;
    const submissionRate = submissionDenom > 0 ? round1((overviewRow.submittedPairs / submissionDenom) * 100) : 0;

    const overview: OverviewStats = {
      totalStudents: overviewRow.totalStudents,
      totalAssignments: overviewRow.totalAssignments,
      submissionRate,
      averageGrade,
      highest: resolvedHighest,
      lowest: resolvedLowest,
      overdueMissing: overviewRow.overdueMissingPairs,
    };

    return NextResponse.json(
      {
        success: true,
        data: {
          students: summaries,
          overview,
          pagination: {
            page,
            pageSize,
            total: totalFilteredStudents,
            totalPages: Math.max(1, Math.ceil(totalFilteredStudents / pageSize)),
          },
        },
        requestId,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error(
      `[ERROR] [GET] /api/teachers/classrooms/${params.id}/gradebook/students {requestId:${requestId}}`,
      error
    );
    return errorResponse(500, "Internal server error", { requestId });
  }
}
