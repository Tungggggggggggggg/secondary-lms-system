import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, getAuthenticatedUser, getRequestId, isTeacherOfClassroom } from "@/lib/api-utils";
import { getEffectiveDeadline, isAssignmentOverdue } from "@/lib/grades/assignmentDeadline";
import { join, sqltag as sql } from "@prisma/client/runtime/library";

type ParentInfo = {
  id: string;
  fullname: string;
  email: string;
};

type StudentInfo = {
  id: string;
  fullname: string;
  email: string;
  joinedAt: string;
  parents: ParentInfo[];
};

interface TeacherStudentSubmissionRow {
  id: string;
  assignmentId: string;
  grade: number | null;
  feedback: string | null;
  submittedAt: Date;
  assignment: {
    id: string;
    title: string;
    type: string;
    dueDate: Date | null;
    lockAt: Date | null;
  };
}

type LatestSubmissionRow = {
  id: string;
  assignmentId: string;
  grade: number | null;
  feedback: string | null;
  submittedAt: Date;
  title: string;
  type: string;
  dueDate: Date | null;
  lockAt: Date | null;
};

type AssignmentSummaryRow = {
  id: string;
  title: string | null;
  type: string;
  dueDate: Date | null;
  lockAt: Date | null;
};

// GET: Điểm chi tiết của một học sinh trong lớp (teacher view)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; studentId: string } }
) {
  const requestId = getRequestId(req);
  try {
    const classroomId = params.id;
    const studentId = params.studentId;
    if (!classroomId || !studentId) {
      return errorResponse(400, "classroomId and studentId are required", { requestId });
    }

    const user = await getAuthenticatedUser(req);
    if (!user) return errorResponse(401, "Unauthorized", { requestId });
    if (user.role !== "TEACHER") return errorResponse(403, "Forbidden", { requestId });

    const owns = await isTeacherOfClassroom(user.id, classroomId);
    if (!owns) {
      return errorResponse(403, "Forbidden - Not your classroom", { requestId });
    }

    const [classroomStudent, parentLinks] = await Promise.all([
      prisma.classroomStudent.findUnique({
        where: { classroomId_studentId: { classroomId, studentId } },
        select: {
          joinedAt: true,
          student: { select: { id: true, fullname: true, email: true } },
        },
      }),
      prisma.parentStudent.findMany({
        where: { studentId, status: "ACTIVE" },
        select: { parent: { select: { id: true, fullname: true, email: true } } },
      }),
    ]);

    if (!classroomStudent) {
      return errorResponse(404, "Student not found in classroom", { requestId });
    }

    const fullname =
      classroomStudent.student.fullname?.trim() ||
      classroomStudent.student.email.split("@")[0] ||
      "Học sinh";

    const student: StudentInfo = {
      id: classroomStudent.student.id,
      fullname,
      email: classroomStudent.student.email,
      joinedAt: classroomStudent.joinedAt.toISOString(),
      parents: parentLinks.map((x) => ({
        id: x.parent.id,
        fullname: x.parent.fullname,
        email: x.parent.email,
      })),
    };

    // Lấy danh sách assignmentId thuộc classroom
    const ac = await prisma.assignmentClassroom.findMany({
      where: { classroomId },
      select: { assignmentId: true },
    });
    const assignmentIds: string[] = ac.map(
      (x: { assignmentId: string }) => x.assignmentId,
    );
    if (assignmentIds.length === 0) {
      return NextResponse.json(
        {
          success: true,
          student,
          data: [],
          statistics: {
            totalSubmissions: 0,
            totalGraded: 0,
            totalPending: 0,
            averageGrade: 0,
          },
          requestId,
        },
        { status: 200 }
      );
    }

    const latestRows = ((await prisma.$queryRaw(
      sql`
      SELECT DISTINCT ON (s."assignmentId")
        s.id,
        s."assignmentId" as "assignmentId",
        s.grade,
        s.feedback,
        s."submittedAt" as "submittedAt",
        a.title,
        a.type,
        a."dueDate" as "dueDate",
        a."lockAt" as "lockAt"
      FROM "assignment_submissions" s
      JOIN "assignments" a ON a.id = s."assignmentId"
      WHERE s."studentId" = ${studentId}
        AND s."assignmentId" IN (${join(assignmentIds)})
      ORDER BY s."assignmentId", s.attempt DESC
    `
    )) as unknown) as LatestSubmissionRow[];

    const latestSubmissions = latestRows.map((r): TeacherStudentSubmissionRow => ({
      id: r.id,
      assignmentId: r.assignmentId,
      grade: r.grade,
      feedback: r.feedback,
      submittedAt: r.submittedAt,
      assignment: {
        id: r.assignmentId,
        title: r.title,
        type: r.type,
        dueDate: r.dueDate,
        lockAt: r.lockAt,
      },
    }));

    const grades = latestSubmissions.map((sub: TeacherStudentSubmissionRow) => ({
      id: sub.id,
      assignmentId: sub.assignment.id,
      assignmentTitle: sub.assignment.title,
      assignmentType: sub.assignment.type,
      dueDate: getEffectiveDeadline(sub.assignment)?.toISOString() || null,
      grade: sub.grade,
      feedback: sub.feedback,
      submittedAt: sub.submittedAt.toISOString(),
      status:
        sub.grade !== null
          ? "graded"
          : sub.submittedAt
          ? "submitted"
          : "pending",
    }));

    const submittedAssignmentIds = new Set<string>(latestSubmissions.map((s) => s.assignmentId));
    const missingAssignmentIds = assignmentIds.filter((aid: string) => !submittedAssignmentIds.has(aid));

    const assignments = (await prisma.assignment.findMany({
      where: { id: { in: missingAssignmentIds } },
      select: { id: true, title: true, type: true, dueDate: true, lockAt: true },
    })) as AssignmentSummaryRow[];

    const now = new Date();
    const missingRows = assignments.map((a) => {
      const isPastDue = isAssignmentOverdue(a, now);
      const effectiveDeadline = getEffectiveDeadline(a);
      return {
        id: `virtual-${studentId}-${a.id}`,
        assignmentId: a.id,
        assignmentTitle: a.title ?? "",
        assignmentType: a.type,
        dueDate: effectiveDeadline ? effectiveDeadline.toISOString() : null,
        grade: isPastDue ? 0 : null,
        feedback: null as string | null,
        submittedAt: null as string | null,
        status: isPastDue ? "graded" : "pending",
      };
    });

    const allRows = [...grades, ...missingRows];

    const gradedRows = allRows.filter((r) => r.grade !== null);
    const totalAssignments = assignmentIds.length;
    const totalGraded = gradedRows.length;
    const totalPending = Math.max(0, totalAssignments - totalGraded);
    const sumGrades = gradedRows.reduce((sum, r) => sum + (r.grade || 0), 0);
    const averageGrade = totalGraded > 0 ? sumGrades / totalGraded : 0;

    return NextResponse.json(
      {
        success: true,
        student,
        data: allRows,
        statistics: {
          totalSubmissions: totalAssignments,
          totalGraded,
          totalPending,
          averageGrade: Math.round(averageGrade * 10) / 10,
        },
        requestId,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error(
      `[ERROR] [GET] /api/teachers/classrooms/${params.id}/students/${params.studentId}/grades {requestId:${requestId}}`,
      error
    );
    return errorResponse(500, "Internal server error", { requestId });
  }
}


