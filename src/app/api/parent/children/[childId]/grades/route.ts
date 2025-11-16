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

    // Lấy danh sách classroom mà học sinh (con) đang tham gia
    const classroomLinks = await prisma.classroomStudent.findMany({
      where: { studentId: childId },
      select: { classroomId: true },
    });

    const classroomIds = classroomLinks.map((cs) => cs.classroomId);

    if (classroomIds.length === 0) {
      return NextResponse.json(
        {
          success: true,
          data: [],
          statistics: {
            totalSubmissions: 0,
            totalGraded: 0,
            totalPending: 0,
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
            totalSubmissions: 0,
            totalGraded: 0,
            totalPending: 0,
            averageGrade: 0,
          },
        },
        { status: 200 }
      );
    }

    // Lấy tất cả submissions của student (bao gồm cả chưa chấm) cho các assignments này
    const submissions = await prisma.assignmentSubmission.findMany({
      where: {
        studentId: childId,
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

    // Tính thống kê dựa trên submissions thật
    const totalSubmissions = submissions.length;
    const gradedSubmissions = submissions.filter((sub) => sub.grade !== null);
    const totalGraded = gradedSubmissions.length;
    const totalPending = totalSubmissions - totalGraded;

    const averageGrade =
      totalGraded > 0
        ? gradedSubmissions.reduce((sum, sub) => sum + (sub.grade || 0), 0) / totalGraded
        : 0;

    console.log(
      `[INFO] [GET] /api/parent/children/${childId}/grades - Found ${grades.length} grade entries for student: ${childId}`
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
  } catch (error: unknown) {
    console.error("[ERROR] [GET] /api/parent/children/[childId]/grades - Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(500, errorMessage);
  }
}, "PARENT_CHILD_GRADES");

