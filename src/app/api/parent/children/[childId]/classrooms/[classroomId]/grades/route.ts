import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, withApiLogging, errorResponse } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

/**
 * GET /api/parent/children/[childId]/classrooms/[classroomId]/grades
 * Lấy danh sách điểm số của học sinh (con) trong một lớp học cụ thể
 * Chỉ phụ huynh đã liên kết với học sinh mới có thể xem
 */
export const GET = withApiLogging(async (
  req: NextRequest,
  { params }: { params: { childId: string; classroomId: string } }
) => {
  try {
    const childId = params.childId;
    const classroomId = params.classroomId;

    if (!childId || !classroomId) {
      return errorResponse(400, "childId and classroomId are required");
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

    // Kiểm tra student có tham gia classroom không
    const isMember = await prisma.classroomStudent.findFirst({
      where: {
        classroomId,
        studentId: childId,
      },
    });

    if (!isMember) {
      return errorResponse(403, "Forbidden - Student is not a member of this classroom");
    }

    // Lấy tất cả assignments của classroom
    const assignmentIds = await prisma.assignmentClassroom.findMany({
      where: { classroomId },
      select: { assignmentId: true },
    });

    const assignmentIdList = assignmentIds.map((ac) => ac.assignmentId);

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

    // Lấy submissions của student cho các assignments này
    const submissions = await prisma.assignmentSubmission.findMany({
      where: {
        studentId: childId,
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

    // Transform data - Bao gồm cả chưa chấm
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

    // Tính điểm trung bình (chỉ tính các bài đã chấm)
    const gradedSubmissions = submissions.filter((sub) => sub.grade !== null);
    const totalSubmissions = submissions.length;
    const totalGraded = gradedSubmissions.length;
    const totalPending = totalSubmissions - totalGraded;

    const averageGrade =
      totalGraded > 0
        ? gradedSubmissions.reduce((sum, sub) => sum + (sub.grade || 0), 0) / totalGraded
        : 0;

    console.log(
      `[INFO] [GET] /api/parent/children/${childId}/classrooms/${classroomId}/grades - Found ${grades.length} submissions for student: ${childId}`
    );

    return NextResponse.json(
      {
        success: true,
        data: grades,
        statistics: {
          totalSubmissions,
          totalGraded,
          totalPending,
          averageGrade: Math.round(averageGrade * 10) / 10,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error(
      "[ERROR] [GET] /api/parent/children/[childId]/classrooms/[classroomId]/grades - Error:",
      error
    );
    return errorResponse(500, error.message || "Internal server error");
  }
}, "PARENT_CHILD_CLASSROOM_GRADES");

