import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

/**
 * GET /api/students/grades
 * Lấy danh sách điểm số của student từ tất cả classrooms
 */
export async function GET(req: NextRequest) {
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

    // Lấy tất cả submissions của student có điểm (đã được chấm)
    const submissions = await prisma.assignmentSubmission.findMany({
      where: {
        studentId: user.id,
        grade: { not: null }, // Chỉ lấy submissions đã được chấm
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

    // Transform data
    const grades = submissions.map((sub) => {
      const classroom = sub.assignment.classrooms[0]?.classroom; // Lấy classroom đầu tiên

      return {
        id: sub.id,
        assignmentId: sub.assignment.id,
        assignmentTitle: sub.assignment.title,
        assignmentType: sub.assignment.type,
        grade: sub.grade,
        feedback: sub.feedback,
        submittedAt: sub.submittedAt.toISOString(),
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

    // Tính điểm trung bình
    const totalGrades = grades.filter((g) => g.grade !== null);
    const averageGrade =
      totalGrades.length > 0
        ? totalGrades.reduce((sum, g) => sum + (g.grade || 0), 0) /
          totalGrades.length
        : 0;

    console.log(
      `[INFO] [GET] /api/students/grades - Found ${grades.length} graded submissions for student: ${user.id}`
    );

    return NextResponse.json(
      {
        success: true,
        data: grades,
        statistics: {
          totalGraded: totalGrades.length,
          averageGrade: Math.round(averageGrade * 10) / 10, // Làm tròn 1 chữ số thập phân
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[ERROR] [GET] /api/students/grades - Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
