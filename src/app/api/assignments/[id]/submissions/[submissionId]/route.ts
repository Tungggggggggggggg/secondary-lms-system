import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { errorResponse, getAuthenticatedUser, isTeacherOfAssignment } from "@/lib/api-utils";

const putSchema = z
  .object({
    grade: z.number().min(0).max(10).optional(),
    feedback: z.string().max(5000).optional(),
  })
  .strict();

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
    const user = await getAuthenticatedUser(req);
    if (!user) return errorResponse(401, "Unauthorized");
    if (user.role !== "TEACHER") return errorResponse(403, "Forbidden");

    const assignmentId = params.id;
    const submissionId = params.submissionId;

    // Parse request body
    const rawBody: unknown = await req.json().catch(() => null);
    const parsedBody = putSchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ", {
        details: parsedBody.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      });
    }

    const { grade, feedback } = parsedBody.data;

    if (grade === undefined && feedback === undefined) {
      return errorResponse(400, "No changes provided");
    }

    // Validate grade (0-10)
    if (grade !== undefined && (grade < 0 || grade > 10)) {
      return errorResponse(400, "Grade must be between 0 and 10");
    }

    // Kiểm tra teacher có sở hữu assignment không
    const isOwner = await isTeacherOfAssignment(user.id, assignmentId);
    if (!isOwner) {
      return errorResponse(403, "Forbidden - Not your assignment");
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
      return errorResponse(404, "Submission not found");
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
        presentation: true,
        contentSnapshot: true,
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
  } catch (error: unknown) {
    console.error(
      "[ERROR] [PUT] /api/assignments/[id]/submissions/[submissionId] - Error:",
      error
    );
    return errorResponse(500, "Internal server error");
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
    const user = await getAuthenticatedUser(req);
    if (!user) return errorResponse(401, "Unauthorized");
    if (user.role !== "TEACHER") return errorResponse(403, "Forbidden");

    const assignmentId = params.id;
    const submissionId = params.submissionId;

    // Kiểm tra teacher có sở hữu assignment không
    const isOwner = await isTeacherOfAssignment(user.id, assignmentId);
    if (!isOwner) {
      return errorResponse(403, "Forbidden - Not your assignment");
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
        presentation: true,
        contentSnapshot: true,
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
      return errorResponse(404, "Submission not found");
    }

    // Parse quiz answers nếu là quiz assignment
    let parsedAnswers = null;
    if (submission.assignment.type === "QUIZ") {
      try {
        parsedAnswers = JSON.parse(submission.content);
      } catch {
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
          presentation: submission.presentation ?? null,
          contentSnapshot: submission.contentSnapshot ?? null,
          answers: parsedAnswers, // Thêm parsed answers cho quiz
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error(
      "[ERROR] [GET] /api/assignments/[id]/submissions/[submissionId] - Error:",
      error
    );
    return errorResponse(500, "Internal server error");
  }
}

