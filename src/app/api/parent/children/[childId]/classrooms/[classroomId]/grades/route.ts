import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, withApiLogging, errorResponse } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

interface ChildSubmissionRow {
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

    if (authUser.role !== "PARENT") {
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

    if (!student || student.role !== "STUDENT") {
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

    const assignmentIdList: string[] = Array.from(
      new Set<string>(
        assignmentIds.map(
          (ac: { assignmentId: string }) => ac.assignmentId,
        ),
      ),
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

    // Lấy submissions của student cho các assignments này
    const submissions = (await prisma.assignmentSubmission.findMany({
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
    })) as ChildSubmissionRow[];

    // Transform data cho các bài đã nộp (bao gồm cả chưa chấm)
    const submissionGrades = submissions.map((sub: ChildSubmissionRow) => ({
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
            (id: string) => !submittedAssignmentIds.has(id),
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
    const missingGrades = missingAssignments.map(
      (assignment: { id: string; title: string; type: string; dueDate: Date | null }) => {
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
    },
    );

    const grades = [...submissionGrades, ...missingGrades];

    // Tính điểm trung bình (chỉ tính các bài đã chấm)
    const gradedSubmissions = submissions.filter(
      (sub: ChildSubmissionRow) => sub.grade !== null,
    );
    const totalSubmissions = submissions.length;
    const totalGraded = gradedSubmissions.length;
    const totalPending = totalSubmissions - totalGraded;

    const averageGrade =
      totalGraded > 0
        ? gradedSubmissions.reduce((sum, sub) => sum + (sub.grade || 0), 0) / totalGraded
        : 0;

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
  } catch (error: unknown) {
    console.error(
      "[ERROR] [GET] /api/parent/children/[childId]/classrooms/[classroomId]/grades - Error:",
      error
    );
    return errorResponse(500, "Internal server error");
  }
}, "PARENT_CHILD_CLASSROOM_GRADES");

