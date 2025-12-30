import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { errorResponse, getAuthenticatedUser, getRequestId, isTeacherOfClassroom } from "@/lib/api-utils";
import { getEffectiveDeadline, isAssignmentOverdue } from "@/lib/grades/assignmentDeadline";
import { join, sqltag as sql } from "@prisma/client/runtime/library";

const querySchema = z.object({
  search: z.string().max(200).default(""),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(50).default(10),
  columns: z.coerce.number().int().min(1).max(30).default(8),
  colPage: z.coerce.number().int().min(1).default(1),
});

type GradebookStudent = {
  id: string;
  fullname: string;
  email: string;
};

type GradebookAssignment = {
  id: string;
  title: string;
  type: string;
  dueDate: string | null;
};

type GradebookCell = {
  studentId: string;
  assignmentId: string;
  submissionId: string;
  grade: number | null;
  feedback: string | null;
  submittedAt: string | null;
};

type DbCellRow = {
  submissionId: string;
  studentId: string;
  assignmentId: string;
  grade: number | null;
  feedback: string | null;
  submittedAt: Date | null;
};

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
      columns: searchParams.get("columns") || undefined,
      colPage: searchParams.get("colPage") || undefined,
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
    const columns = parsed.data.columns;
    const colPage = parsed.data.colPage;
    const offset = (page - 1) * pageSize;
    const colOffset = (colPage - 1) * columns;

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

    const [totalStudents, totalAssignments, studentsRows, assignmentRows] = await Promise.all([
      prisma.classroomStudent.count({ where: studentWhere }),
      prisma.assignmentClassroom.count({ where: { classroomId } }),
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
          addedAt: true,
          assignment: { select: { id: true, title: true, type: true, dueDate: true, lockAt: true } },
        },
        orderBy: { addedAt: "desc" },
        take: columns,
        skip: colOffset,
      }),
    ]);

    const students: GradebookStudent[] = studentsRows.map((r) => {
      const s = r.student;
      const fullname = s.fullname?.trim() || s.email.split("@")[0] || "Học sinh";
      return { id: s.id, fullname, email: s.email };
    });

    const assignments: GradebookAssignment[] = assignmentRows.map((r) => {
      const a = r.assignment;
      const effectiveDeadline = getEffectiveDeadline({ dueDate: a.dueDate, lockAt: a.lockAt });
      return {
        id: a.id,
        title: a.title,
        type: a.type,
        dueDate: effectiveDeadline ? effectiveDeadline.toISOString() : null,
      };
    });

    const studentIds = students.map((s) => s.id);
    const assignmentIds = assignments.map((a) => a.id);

    let cells: GradebookCell[] = [];
    if (studentIds.length && assignmentIds.length) {
      const raw = (await prisma.$queryRaw(
        sql`
          SELECT DISTINCT ON (s."studentId", s."assignmentId")
            s.id as "submissionId",
            s."studentId" as "studentId",
            s."assignmentId" as "assignmentId",
            s.grade as "grade",
            s.feedback as "feedback",
            s."submittedAt" as "submittedAt"
          FROM "assignment_submissions" s
          WHERE s."studentId" IN (${join(studentIds)})
            AND s."assignmentId" IN (${join(assignmentIds)})
          ORDER BY s."studentId", s."assignmentId", s.attempt DESC
        `
      )) as unknown as DbCellRow[];

      cells = raw.map((r) => ({
        studentId: r.studentId,
        assignmentId: r.assignmentId,
        submissionId: r.submissionId,
        grade: r.grade,
        feedback: r.feedback,
        submittedAt: r.submittedAt ? r.submittedAt.toISOString() : null,
      }));
    }

    const cellMap = new Map<string, GradebookCell>();
    cells.forEach((c) => cellMap.set(`${c.studentId}:${c.assignmentId}`, c));

    const now = new Date();
    let graded = 0;
    let submitted = 0;
    let missing = 0;
    let overdueMissing = 0;
    let sum = 0;
    let count = 0;
    let highest: number | null = null;
    let lowest: number | null = null;

    for (const studentId of studentIds) {
      for (const a of assignments) {
        const key = `${studentId}:${a.id}`;
        const cell = cellMap.get(key);
        if (cell) {
          if (cell.grade !== null) {
            graded += 1;
            sum += cell.grade;
            count += 1;
            highest = highest === null ? cell.grade : Math.max(highest, cell.grade);
            lowest = lowest === null ? cell.grade : Math.min(lowest, cell.grade);
          } else if (cell.submittedAt) {
            submitted += 1;
          } else {
            missing += 1;
          }
        } else {
          const due = a.dueDate ? new Date(a.dueDate) : null;
          const isOverdue = !!due && isAssignmentOverdue({ dueDate: due, lockAt: null }, now);
          if (isOverdue) overdueMissing += 1;
          else missing += 1;
        }
      }
    }

    const denom = count + overdueMissing;
    const averageGrade = denom > 0 ? Math.round((sum / denom) * 10) / 10 : null;

    const resolvedHighest =
      denom > 0
        ? highest !== null
          ? highest
          : overdueMissing > 0
          ? 0
          : null
        : null;
    const resolvedLowest = denom > 0 ? (overdueMissing > 0 ? 0 : lowest) : null;

    return NextResponse.json(
      {
        success: true,
        data: {
          students,
          assignments,
          cells,
          statistics: {
            graded,
            submitted,
            missing,
            overdueMissing,
            averageGrade,
            highest: resolvedHighest,
            lowest: resolvedLowest,
          },
          pagination: {
            page,
            pageSize,
            total: totalStudents,
            totalPages: Math.max(1, Math.ceil(totalStudents / pageSize)),
          },
          columnPagination: {
            page: colPage,
            pageSize: columns,
            total: totalAssignments,
            totalPages: Math.max(1, Math.ceil(totalAssignments / columns)),
          },
        },
        requestId,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error(
      `[ERROR] [GET] /api/teachers/classrooms/${params.id}/gradebook {requestId:${requestId}}`,
      error
    );
    return errorResponse(500, "Internal server error", { requestId });
  }
}
