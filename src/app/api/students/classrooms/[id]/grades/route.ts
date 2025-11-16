import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

/**
 * GET /api/students/classrooms/[id]/grades
 * Lấy danh sách điểm số của student trong một classroom cụ thể
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || user.role !== UserRole.STUDENT) {
      return NextResponse.json(
        { success: false, message: "Forbidden - Student role required" },
        { status: 403 }
      );
    }

    const classroomId = params.id;

    // Kiểm tra student có tham gia classroom không
    const isMember = await prisma.classroomStudent.findFirst({
      where: {
        classroomId,
        studentId: user.id,
      },
    });

    if (!isMember) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden - Not a member of this classroom",
        },
        { status: 403 }
      );
    }

    // Lấy tất cả assignments của classroom
    const assignmentIds = await prisma.assignmentClassroom.findMany({
      where: { classroomId },
      select: { assignmentId: true },
    });

    const assignmentIdList = Array.from(
      new Set(assignmentIds.map((ac) => ac.assignmentId))
    );

    if (assignmentIdList.length === 0) {
      return NextResponse.json(
        {
          success: true,
          data: [],
          statistics: {
            totalGraded: 0,
            averageGrade: 0,
          },
        },
        { status: 200 }
      );
    }

    // Lấy submissions của student cho các assignments này
    const submissions = await prisma.assignmentSubmission.findMany({
      where: {
        studentId: user.id,
        assignmentId: { in: assignmentIdList },
      },
      include: {
        assignment: {
          select: {
            id: true,
            title: true,
            type: true,
            dueDate: true,
          },
        },
      },
      orderBy: { submittedAt: "desc" },
    });

    // Transform data cho các bài đã nộp (bao gồm cả chưa chấm)
    const submissionGrades = submissions.map((sub) => ({
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

    // Tìm các assignments chưa có submission nào từ student
    const submittedAssignmentIds = new Set(
      submissions.map((sub) => sub.assignmentId)
    );

    const missingAssignments = await prisma.assignment.findMany({
      where: {
        id: {
          in: assignmentIdList.filter(
            (id) => !submittedAssignmentIds.has(id)
          ),
        },
      },
      select: {
        id: true,
        title: true,
        type: true,
        dueDate: true,
      },
    });

    const now = new Date();

    // Tạo các grade entry ảo với điểm 0 cho bài chưa nộp
    const missingGrades = missingAssignments.map((assignment) => {
      const isPastDue =
        assignment.dueDate !== null && assignment.dueDate < now;

      return {
        id: `virtual-${assignment.id}`,
        assignmentId: assignment.id,
        assignmentTitle: assignment.title,
        assignmentType: assignment.type,
        dueDate: assignment.dueDate
          ? assignment.dueDate.toISOString()
          : null,
        grade: 0,
        feedback: null,
        submittedAt: null as string | null,
        status: isPastDue ? "graded" : "pending",
      };
    });

    const grades = [...submissionGrades, ...missingGrades];

    // Tính điểm trung bình (chỉ tính các bài đã chấm)
    const gradedSubmissions = submissions.filter((sub) => sub.grade !== null);
    const averageGrade =
      gradedSubmissions.length > 0
        ? gradedSubmissions.reduce((sum, sub) => sum + (sub.grade || 0), 0) /
          gradedSubmissions.length
        : 0;

    console.log(
      `[INFO] [GET] /api/students/classrooms/${classroomId}/grades - Found ${grades.length} submissions for student: ${user.id}`
    );

    return NextResponse.json(
      {
        success: true,
        data: grades,
        statistics: {
          totalSubmissions: submissions.length,
          totalGraded: gradedSubmissions.length,
          totalPending: submissions.length - gradedSubmissions.length,
          averageGrade: Math.round(averageGrade * 10) / 10,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error(
      "[ERROR] [GET] /api/students/classrooms/[id]/grades - Error:",
      error
    );
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
