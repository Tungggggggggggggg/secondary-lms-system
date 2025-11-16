import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

/**
 * GET /api/students/grades
 * Lấy danh sách điểm số của student từ tất cả classrooms
 */
export async function GET(_req: NextRequest) {
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

    // Lấy danh sách classroom mà student đang tham gia
    const classroomLinks = await prisma.classroomStudent.findMany({
      where: { studentId: user.id },
      select: { classroomId: true },
    });

    const classroomIds = classroomLinks.map((cs) => cs.classroomId);

    if (classroomIds.length === 0) {
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

    // Lấy tất cả assignments của các classroom này
    const assignmentLinks = await prisma.assignmentClassroom.findMany({
      where: {
        classroomId: { in: classroomIds },
      },
      select: { assignmentId: true },
    });

    const assignmentIdList = Array.from(
      new Set(assignmentLinks.map((al) => al.assignmentId))
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

    // Lấy tất cả submissions của student cho các assignments này (bao gồm cả chưa chấm)
    const submissions = await prisma.assignmentSubmission.findMany({
      where: {
        studentId: user.id,
        assignmentId: { in: assignmentIdList },
      },
      include: {
        assignment: {
          include: {
            classrooms: {
              include: {
                classroom: {
                  include: {
                    teacher: {
                      select: { id: true, fullname: true, email: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { submittedAt: "desc" },
    });

    // Transform data cho các bài đã nộp
    const submissionGrades = submissions.map((sub) => {
      const classroom = sub.assignment.classrooms[0]?.classroom; // Lấy classroom đầu tiên

      return {
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
        classroom: classroom
          ? {
              id: classroom.id,
              name: classroom.name,
              code: classroom.code,
              icon: classroom.icon,
              teacher: classroom.teacher,
            }
          : null,
      };
    });

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
      include: {
        classrooms: {
          include: {
            classroom: {
              include: {
                teacher: {
                  select: { id: true, fullname: true, email: true },
                },
              },
            },
          },
        },
      },
    });

    const now = new Date();

    // Tạo các grade entry ảo với điểm 0 cho bài chưa nộp
    const missingGrades = missingAssignments.map((assignment) => {
      const classroom = assignment.classrooms[0]?.classroom;
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
        classroom: classroom
          ? {
              id: classroom.id,
              name: classroom.name,
              code: classroom.code,
              icon: classroom.icon,
              teacher: classroom.teacher,
            }
          : null,
      };
    });

    const grades = [...submissionGrades, ...missingGrades];

    // Tính điểm trung bình chỉ dựa trên các bài đã được chấm thực tế
    const gradedSubmissions = submissions.filter((sub) => sub.grade !== null);
    const averageGrade =
      gradedSubmissions.length > 0
        ? gradedSubmissions.reduce((sum, sub) => sum + (sub.grade || 0), 0) /
          gradedSubmissions.length
        : 0;

    console.log(
      `[INFO] [GET] /api/students/grades - Found ${grades.length} grade entries for student: ${user.id}`
    );

    return NextResponse.json(
      {
        success: true,
        data: grades,
        statistics: {
          totalGraded: gradedSubmissions.length,
          averageGrade: Math.round(averageGrade * 10) / 10, // Làm tròn 1 chữ số thập phân
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("[ERROR] [GET] /api/students/grades - Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
