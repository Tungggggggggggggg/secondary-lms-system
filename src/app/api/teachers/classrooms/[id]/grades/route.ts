import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { errorResponse, getAuthenticatedUser, getRequestId, isTeacherOfClassroom } from "@/lib/api-utils";
import { getEffectiveDeadline, isAssignmentOverdue } from "@/lib/grades/assignmentDeadline";
import { join, sqltag as sql } from "@prisma/client/runtime/library";

interface TeacherClassroomAssignmentSummary {
  id: string;
  title: string | null;
  type: string;
  dueDate: Date | null;
  lockAt: Date | null;
}

type LatestSubmissionRow = {
  id: string;
  assignmentId: string;
  studentId: string;
  grade: number | null;
  feedback: string | null;
  submittedAt: Date;
};

const querySchema = z.object({
  status: z.enum(["all", "graded", "ungraded"]).default("all"),
  search: z.string().max(200).default(""),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// GET: Danh sách submissions/grades của lớp cho giáo viên (newest-first, filter, search)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const parsedQuery = querySchema.safeParse({
      status: searchParams.get("status") || undefined,
      search: searchParams.get("search") || undefined,
      page: searchParams.get("page") || undefined,
      pageSize: searchParams.get("pageSize") || undefined,
    });
    if (!parsedQuery.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ", {
        requestId,
        details: parsedQuery.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      });
    }

    const status = parsedQuery.data.status;
    const search = parsedQuery.data.search.trim().toLowerCase();
    const page = parsedQuery.data.page;
    const pageSize = parsedQuery.data.pageSize;

    // Lấy assignmentIds của lớp
    const ac = await prisma.assignmentClassroom.findMany({
      where: { classroomId },
      select: { assignmentId: true },
    });
    const assignmentIds: string[] = Array.from(
      new Set(
        ac.map((x: { assignmentId: string }) => x.assignmentId),
      ),
    );
    if (assignmentIds.length === 0) {
      return NextResponse.json(
        { success: true, data: [], statistics: { total: 0, graded: 0 }, requestId },
        { status: 200 }
      );
    }

    // Lấy danh sách học sinh trong lớp
    const classroomStudents = await prisma.classroomStudent.findMany({
      where: { classroomId },
      select: {
        studentId: true,
        student: { select: { id: true, fullname: true, email: true } },
      },
    });

    const studentIds = classroomStudents.map(
      (cs: { studentId: string }) => cs.studentId,
    );
    if (studentIds.length === 0) {
      return NextResponse.json(
        { success: true, data: [], statistics: { total: 0, graded: 0 }, requestId },
        { status: 200 }
      );
    }

    // Lấy thông tin assignments
    const assignments = (await prisma.assignment.findMany({
      where: { id: { in: assignmentIds } },
      select: { id: true, title: true, type: true, dueDate: true, lockAt: true },
    })) as TeacherClassroomAssignmentSummary[];
    const assignmentMap = new Map<string, TeacherClassroomAssignmentSummary>(
      assignments.map((a: TeacherClassroomAssignmentSummary) => [a.id, a]),
    );

    const studentById = new Map<string, { id: string; fullname: string | null; email: string }>(
      classroomStudents.map((cs: { studentId: string; student: { id: string; fullname: string | null; email: string } }) => [
        cs.studentId,
        cs.student,
      ])
    );

    const latestSubmissions = ((await prisma.$queryRaw(
      sql`
      SELECT DISTINCT ON (s."studentId", s."assignmentId")
        s.id,
        s."studentId" as "studentId",
        s."assignmentId" as "assignmentId",
        s.grade,
        s.feedback,
        s."submittedAt" as "submittedAt"
      FROM "assignment_submissions" s
      WHERE s."assignmentId" IN (${join(assignmentIds)})
        AND s."studentId" IN (${join(studentIds)})
      ORDER BY s."studentId", s."assignmentId", s.attempt DESC
    `
    )) as unknown) as LatestSubmissionRow[];

    const submissionRows = latestSubmissions.map((s) => {
      const student = studentById.get(s.studentId);
      const assignment = assignmentMap.get(s.assignmentId);
      const effectiveDeadline = assignment ? getEffectiveDeadline(assignment) : null;
      return {
        id: s.id,
        student: {
          id: student?.id ?? s.studentId,
          fullname: student?.fullname ?? null,
          email: student?.email ?? "",
        },
        assignment: {
          id: assignment?.id ?? s.assignmentId,
          title: assignment?.title ?? "",
          type: assignment?.type ?? "ESSAY",
          dueDate: effectiveDeadline ? effectiveDeadline.toISOString() : null,
        },
        grade: s.grade,
        feedback: s.feedback,
        submittedAt: s.submittedAt.toISOString() as string | null,
        status: s.grade !== null ? "graded" : "submitted",
      };
    });

    // Tạo các bản ghi ảo điểm 0 cho (student, assignment) chưa có submission
    const existingKeys = new Set(
      latestSubmissions.map((s) => `${s.studentId}-${s.assignmentId}`)
    );

    const now = new Date();
    const virtualRows = classroomStudents.flatMap((cs: {
      studentId: string;
      student: { id: string; fullname: string | null; email: string };
    }) =>
      assignmentIds
        .filter((assignmentId) => !existingKeys.has(`${cs.studentId}-${assignmentId}`))
        .map((assignmentId) => {
          const assignment = assignmentMap.get(assignmentId);
          const isPastDue = assignment ? isAssignmentOverdue(assignment, now) : false;
          const effectiveDeadline = assignment ? getEffectiveDeadline(assignment) : null;

          return {
            id: `virtual-${cs.studentId}-${assignmentId}`,
            student: {
              id: cs.student.id,
              fullname: cs.student.fullname,
              email: cs.student.email,
            },
            assignment: {
              id: assignmentId,
              title: assignment?.title ?? "",
              type: assignment?.type ?? "ESSAY",
              dueDate: effectiveDeadline ? effectiveDeadline.toISOString() : null,
            },
            grade: isPastDue ? 0 : null,
            feedback: null as string | null,
            submittedAt: null as string | null,
            status: isPastDue ? "graded" : "submitted",
          };
        })
    );

    // Gộp rows thật + ảo
    let allRows = [...submissionRows, ...virtualRows];

    // Lọc theo status
    if (status === "graded") {
      allRows = allRows.filter((r) => r.grade !== null);
    } else if (status === "ungraded") {
      allRows = allRows.filter((r) => r.grade === null);
    }

    // Lọc theo search
    if (search) {
      const q = search.toLowerCase();
      allRows = allRows.filter((d) => {
        const fullname = (d.student.fullname ?? "").toLowerCase();
        const email = d.student.email.toLowerCase();
        const title = d.assignment.title.toLowerCase();
        return (
          fullname.includes(q) ||
          email.includes(q) ||
          title.includes(q)
        );
      });
    }

    // Tổng và số đã chấm
    const total = allRows.length;
    const graded = allRows.filter((d) => d.grade !== null).length;

    // Sort newest-first theo submittedAt (null sẽ xuống cuối, dùng dueDate fallback)
    allRows.sort((a, b) => {
      const aTime = a.submittedAt
        ? new Date(a.submittedAt).getTime()
        : a.assignment.dueDate
        ? new Date(a.assignment.dueDate).getTime()
        : 0;
      const bTime = b.submittedAt
        ? new Date(b.submittedAt).getTime()
        : b.assignment.dueDate
        ? new Date(b.assignment.dueDate).getTime()
        : 0;
      return bTime - aTime;
    });

    // Pagination in-memory
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageRows = allRows.slice(start, end);

    const res = NextResponse.json(
      {
        success: true,
        data: pageRows,
        statistics: { total, graded },
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
        requestId,
      },
      { status: 200 }
    );
    res.headers.set("Cache-Control", "public, max-age=10, s-maxage=30, stale-while-revalidate=60");
    return res;
  } catch (error: unknown) {
    console.error(
      `[ERROR] [GET] /api/teachers/classrooms/${params.id}/grades {requestId:${requestId}}`,
      error
    );
    return errorResponse(500, "Internal server error", { requestId });
  }
}


