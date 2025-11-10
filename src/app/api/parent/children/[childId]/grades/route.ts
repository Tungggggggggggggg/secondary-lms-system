import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, withApiLogging, errorResponse } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

/**
 * GET /api/parent/children/[childId]/grades
 * Lấy danh sách điểm số của học sinh (con) từ tất cả classrooms
 * Chỉ phụ huynh đã liên kết với học sinh mới có thể xem
 */
export const GET = withApiLogging(async (
  req: NextRequest,
  { params }: { params: { childId: string } }
) => {
  try {
    const childId = params.childId;
    if (!childId) {
      return errorResponse(400, "childId is required");
    }

    // Xác thực user và kiểm tra role
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return errorResponse(401, "Unauthorized");
    }

    if (authUser.role !== UserRole.PARENT) {
      return errorResponse(403, "Forbidden - PARENT role required");
    }

    // Kiểm tra parent-student relationship
    const relationship = await prisma.parentStudent.findUnique({
      where: {
        parentId_studentId: {
          parentId: authUser.id,
          studentId: childId,
        },
      },
    });

    if (!relationship) {
      return errorResponse(403, "Forbidden - No relationship found with this student");
    }

    // Kiểm tra status phải là ACTIVE
    if (relationship.status !== "ACTIVE") {
      return errorResponse(403, "Forbidden - Relationship is not active");
    }

    // Kiểm tra student có tồn tại và có role STUDENT
    const student = await prisma.user.findUnique({
      where: { id: childId },
      select: { id: true, role: true },
    });

    if (!student || student.role !== UserRole.STUDENT) {
      return errorResponse(404, "Student not found");
    }

    // Lấy tất cả submissions của student (bao gồm cả chưa chấm)
    const submissions = await prisma.assignmentSubmission.findMany({
      where: {
        studentId: childId,
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
        dueDate: sub.assignment.dueDate?.toISOString() || null,
        grade: sub.grade,
        feedback: sub.feedback,
        submittedAt: sub.submittedAt.toISOString(),
        status: sub.grade !== null ? "graded" : sub.submittedAt ? "submitted" : "pending",
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

    // Tính thống kê
    const totalSubmissions = submissions.length;
    const gradedSubmissions = submissions.filter((sub) => sub.grade !== null);
    const totalGraded = gradedSubmissions.length;
    const totalPending = totalSubmissions - totalGraded;

    const averageGrade =
      totalGraded > 0
        ? gradedSubmissions.reduce((sum, sub) => sum + (sub.grade || 0), 0) / totalGraded
        : 0;

    console.log(
      `[INFO] [GET] /api/parent/children/${childId}/grades - Found ${grades.length} submissions for student: ${childId}`
    );

    return NextResponse.json(
      {
        success: true,
        data: grades,
        statistics: {
          totalSubmissions,
          totalGraded,
          totalPending,
          averageGrade: Math.round(averageGrade * 10) / 10, // Làm tròn 1 chữ số thập phân
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[ERROR] [GET] /api/parent/children/[childId]/grades - Error:", error);
    return errorResponse(500, error.message || "Internal server error");
  }
}, "PARENT_CHILD_GRADES");

