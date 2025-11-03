import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, getRequestId, isTeacherOfClassroom } from "@/lib/api-utils";
import { UserRole } from "@prisma/client";

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
      return NextResponse.json(
        { success: false, message: "classroomId and studentId are required", requestId },
        { status: 400 }
      );
    }

    const user = await getAuthenticatedUser(req, UserRole.TEACHER);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized", requestId },
        { status: 401 }
      );
    }

    const owns = await isTeacherOfClassroom(user.id, classroomId);
    if (!owns) {
      return NextResponse.json(
        { success: false, message: "Forbidden - Not your classroom", requestId },
        { status: 403 }
      );
    }

    // Lấy danh sách assignmentId thuộc classroom
    const ac = await prisma.assignmentClassroom.findMany({
      where: { classroomId },
      select: { assignmentId: true },
    });
    const assignmentIds = ac.map((x) => x.assignmentId);
    if (assignmentIds.length === 0) {
      return NextResponse.json(
        { success: true, data: [], statistics: { totalGraded: 0, averageGrade: 0 }, requestId },
        { status: 200 }
      );
    }

    const submissions = await prisma.assignmentSubmission.findMany({
      where: { studentId, assignmentId: { in: assignmentIds } },
      include: {
        assignment: { select: { id: true, title: true, type: true, dueDate: true } },
      },
      orderBy: { submittedAt: "desc" },
    });

    const grades = submissions.map((sub) => ({
      id: sub.id,
      assignmentId: sub.assignment.id,
      assignmentTitle: sub.assignment.title,
      assignmentType: sub.assignment.type,
      dueDate: sub.assignment.dueDate?.toISOString() || null,
      grade: sub.grade,
      feedback: sub.feedback,
      submittedAt: sub.submittedAt.toISOString(),
      status: sub.grade !== null ? "graded" : sub.submittedAt ? "submitted" : "pending",
    }));

    const graded = submissions.filter((s) => s.grade !== null);
    const averageGrade = graded.length > 0 ? graded.reduce((sum, s) => sum + (s.grade || 0), 0) / graded.length : 0;

    return NextResponse.json(
      {
        success: true,
        data: grades,
        statistics: { totalGraded: graded.length, averageGrade },
        requestId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      `[ERROR] [GET] /api/teachers/classrooms/${params.id}/students/${params.studentId}/grades {requestId:${requestId}}`,
      error
    );
    return NextResponse.json(
      { success: false, message: "Internal server error", requestId },
      { status: 500 }
    );
  }
}


