import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { getAuthenticatedUser, getStudentClassroomForAssignment } from "@/lib/api-utils";

/**
 * GET /api/students/assignments/[id]/submission
 * Lấy submission của student cho assignment này (nếu có)
 * NOTE: API này vẫn được giữ lại để backward compatibility, nhưng khuyến nghị sử dụng combined endpoint /api/students/assignments/[id]
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Sử dụng getAuthenticatedUser với caching
    const user = await getAuthenticatedUser(req, UserRole.STUDENT);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const assignmentId = params.id;

    // Optimize: Kiểm tra student có trong classroom nào có assignment này không (single query)
    const classroomId = await getStudentClassroomForAssignment(user.id, assignmentId);
    if (!classroomId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden - Not a member of this assignment's classroom",
        },
        { status: 403 }
      );
    }

    // Lấy submission của student
    const submission = await prisma.assignmentSubmission.findFirst({
      where: {
        assignmentId,
        studentId: user.id,
      },
      orderBy: { attempt: "desc" },
      select: {
        id: true,
        content: true,
        grade: true,
        feedback: true,
        submittedAt: true,
        attempt: true,
        assignment: {
          select: {
            id: true,
            title: true,
            type: true,
            dueDate: true,
          },
        },
      },
    });

    if (!submission) {
      return NextResponse.json(
        { success: true, data: null },
        { status: 200 }
      );
    }

    // Transform data
    const submissionData = {
      id: submission.id,
      content: submission.content,
      grade: submission.grade,
      feedback: submission.feedback,
      submittedAt: submission.submittedAt.toISOString(),
      assignment: submission.assignment,
      attempt: submission.attempt,
    };

    console.log(
      `[INFO] [GET] /api/students/assignments/${assignmentId}/submission - Found submission for student: ${user.id}`
    );

    return NextResponse.json(
      { success: true, data: submissionData },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "[ERROR] [GET] /api/students/assignments/[id]/submission - Error:",
      error
    );
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}


