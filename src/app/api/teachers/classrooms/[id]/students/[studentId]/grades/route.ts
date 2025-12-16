import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, getAuthenticatedUser, getRequestId, isTeacherOfClassroom } from "@/lib/api-utils";

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
  };
}

type AssignmentSummaryRow = {
  id: string;
  title: string | null;
  type: string;
  dueDate: Date | null;
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

    // Lấy danh sách assignmentId thuộc classroom
    const ac = await prisma.assignmentClassroom.findMany({
      where: { classroomId },
      select: { assignmentId: true },
    });
    const assignmentIds = ac.map(
      (x: { assignmentId: string }) => x.assignmentId,
    );
    if (assignmentIds.length === 0) {
      return NextResponse.json(
        { success: true, data: [], statistics: { totalGraded: 0, averageGrade: 0 }, requestId },
        { status: 200 }
      );
    }

    const submissionsRaw = await prisma.assignmentSubmission.findMany({
      where: { studentId, assignmentId: { in: assignmentIds } },
      include: {
        assignment: { select: { id: true, title: true, type: true, dueDate: true } },
      },
      orderBy: { submittedAt: "desc" },
    });

    const submissions = submissionsRaw as TeacherStudentSubmissionRow[];

    // Giữ lại submission mới nhất cho mỗi assignment
    const latestByAssignmentId = new Map<string, TeacherStudentSubmissionRow>();
    for (const s of submissions) {
      if (!latestByAssignmentId.has(s.assignmentId)) {
        latestByAssignmentId.set(s.assignmentId, s);
      }
    }

    const latestSubmissions = Array.from(latestByAssignmentId.values());

    const grades = latestSubmissions.map((sub: TeacherStudentSubmissionRow) => ({
      id: sub.id,
      assignmentId: sub.assignment.id,
      assignmentTitle: sub.assignment.title,
      assignmentType: sub.assignment.type,
      dueDate: sub.assignment.dueDate?.toISOString() || null,
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
    const missingAssignmentIds = assignmentIds.filter((aid) => !submittedAssignmentIds.has(aid));

    const assignments = (await prisma.assignment.findMany({
      where: { id: { in: missingAssignmentIds } },
      select: { id: true, title: true, type: true, dueDate: true },
    })) as AssignmentSummaryRow[];

    const now = new Date();
    const missingRows = assignments.map((a) => {
      const isPastDue = a.dueDate !== null && a.dueDate < now;
      return {
        id: `virtual-${studentId}-${a.id}`,
        assignmentId: a.id,
        assignmentTitle: a.title ?? "",
        assignmentType: a.type,
        dueDate: a.dueDate ? a.dueDate.toISOString() : null,
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


