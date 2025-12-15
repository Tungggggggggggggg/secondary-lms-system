import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, getAuthenticatedUser, getRequestId, isTeacherOfClassroom } from "@/lib/api-utils";

interface TeacherStudentSubmissionRow {
  id: string;
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

    const grades = submissions.map((sub: TeacherStudentSubmissionRow) => ({
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

    const graded = submissions.filter(
      (s: TeacherStudentSubmissionRow) => s.grade !== null,
    );
    const averageGrade =
      graded.length > 0
        ? graded.reduce(
            (sum: number, s: TeacherStudentSubmissionRow) =>
              sum + (s.grade || 0),
            0,
          ) / graded.length
        : 0;

    return NextResponse.json(
      {
        success: true,
        data: grades,
        statistics: { totalGraded: graded.length, averageGrade },
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


