import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { getAuthenticatedUser, isTeacherOfAssignment } from "@/lib/api-utils";

/**
 * PUT /api/assignments/[id]/submissions/[submissionId]
 * Teacher chấm bài: cập nhật grade và feedback cho submission
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; submissionId: string } }
) {
  try {
    // Sử dụng getAuthenticatedUser với caching
    const user = await getAuthenticatedUser(req, UserRole.TEACHER);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const assignmentId = params.id;
    const submissionId = params.submissionId;

    // Parse request body
    const body = await req.json();
    const { grade, feedback } = body as {
      grade?: number;
      feedback?: string;
    };

    // Validate grade (0-10)
    if (grade !== undefined && (grade < 0 || grade > 10)) {
      return NextResponse.json(
        {
          success: false,
          message: "Grade must be between 0 and 10",
        },
        { status: 400 }
      );
    }

    // Kiểm tra teacher có sở hữu assignment không
    const isOwner = await isTeacherOfAssignment(user.id, assignmentId);
    if (!isOwner) {
      return NextResponse.json(
        { success: false, message: "Forbidden - Not your assignment" },
        { status: 403 }
      );
    }

    // Kiểm tra submission có tồn tại và thuộc về assignment này không
    const submission = await prisma.assignmentSubmission.findFirst({
      where: {
        id: submissionId,
        assignmentId,
      },
      select: {
        id: true,
        assignmentId: true,
        studentId: true,
        content: true,
        grade: true,
        feedback: true,
        submittedAt: true,
        assignment: {
          select: {
            id: true,
            title: true,
            type: true,
          },
        },
        student: {
          select: {
            id: true,
            fullname: true,
            email: true,
          },
        },
      },
    });

    if (!submission) {
      return NextResponse.json(
        { success: false, message: "Submission not found" },
        { status: 404 }
      );
    }

    // Cập nhật grade và feedback
    const updatedSubmission = await prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: {
        grade: grade !== undefined ? grade : submission.grade,
        feedback: feedback !== undefined ? feedback.trim() : submission.feedback,
      },
      select: {
        id: true,
        content: true,
        grade: true,
        feedback: true,
        submittedAt: true,
        assignment: {
          select: {
            id: true,
            title: true,
            type: true,
          },
        },
        student: {
          select: {
            id: true,
            fullname: true,
            email: true,
          },
        },
      },
    });

    console.log(
      `[INFO] [PUT] /api/assignments/${assignmentId}/submissions/${submissionId} - Teacher ${user.id} graded submission (grade: ${grade})`
    );

    return NextResponse.json(
      {
        success: true,
        message: "Submission graded successfully",
        data: {
          ...updatedSubmission,
          submittedAt: updatedSubmission.submittedAt.toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "[ERROR] [PUT] /api/assignments/[id]/submissions/[submissionId] - Error:",
      error
    );
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/assignments/[id]/submissions/[submissionId]
 * Lấy chi tiết một submission cụ thể (cho teacher xem chi tiết)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; submissionId: string } }
) {
  try {
    // Sử dụng getAuthenticatedUser với caching
    const user = await getAuthenticatedUser(req, UserRole.TEACHER);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const assignmentId = params.id;
    const submissionId = params.submissionId;

    // Kiểm tra teacher có sở hữu assignment không
    const isOwner = await isTeacherOfAssignment(user.id, assignmentId);
    if (!isOwner) {
      return NextResponse.json(
        { success: false, message: "Forbidden - Not your assignment" },
        { status: 403 }
      );
    }

    // Lấy submission chi tiết
    const submission = await prisma.assignmentSubmission.findFirst({
      where: {
        id: submissionId,
        assignmentId,
      },
      select: {
        id: true,
        content: true,
        grade: true,
        feedback: true,
        submittedAt: true,
        assignment: {
          select: {
            id: true,
            title: true,
            type: true,
            dueDate: true,
            questions: {
              select: {
                id: true,
                content: true,
                type: true,
                order: true,
                options: {
                  select: {
                    id: true,
                    label: true,
                    content: true,
                    isCorrect: true,
                    order: true,
                  },
                  orderBy: { order: "asc" },
                },
              },
              orderBy: { order: "asc" },
            },
          },
        },
        student: {
          select: {
            id: true,
            fullname: true,
            email: true,
          },
        },
      },
    });

    if (!submission) {
      return NextResponse.json(
        { success: false, message: "Submission not found" },
        { status: 404 }
      );
    }

    // Parse quiz answers nếu là quiz assignment
    let parsedAnswers = null;
    if (submission.assignment.type === "QUIZ") {
      try {
        parsedAnswers = JSON.parse(submission.content);
      } catch (e) {
        // Nếu không parse được, giữ nguyên content
        parsedAnswers = null;
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          ...submission,
          submittedAt: submission.submittedAt.toISOString(),
          answers: parsedAnswers, // Thêm parsed answers cho quiz
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "[ERROR] [GET] /api/assignments/[id]/submissions/[submissionId] - Error:",
      error
    );
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

