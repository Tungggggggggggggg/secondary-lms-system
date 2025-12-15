import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { errorResponse, getAuthenticatedUser, getStudentClassroomForAssignment } from "@/lib/api-utils";

const paramsSchema = z
  .object({
    id: z.string().min(1).max(100),
  })
  .strict();

const getQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();

const postBodySchema = z
  .object({
    content: z.string().min(1).max(5000),
    questionId: z.string().min(1).max(100).optional(),
  })
  .strict();

interface StudentAssignmentCommentRow {
  id: string;
  content: string;
  createdAt: Date;
  user: {
    id: string;
    fullname: string | null;
    email: string;
  };
  question: {
    id: string;
    content: string;
    order: number | null;
  };
}

/**
 * GET /api/students/assignments/[id]/comments
 * Lấy comments của assignment (pagination)
 * OPTIMIZED: Query trực tiếp từ question_comments với join, không cần query questions trước
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Sử dụng getAuthenticatedUser với caching
    const user = await getAuthenticatedUser(req);
    if (!user) return errorResponse(401, "Unauthorized");
    if (user.role !== "STUDENT") return errorResponse(403, "Forbidden - Student role required");

    const parsedParams = paramsSchema.safeParse(params);
    if (!parsedParams.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ", {
        details: parsedParams.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      });
    }

    const assignmentId = parsedParams.data.id;

    // Optimize: Kiểm tra student có trong classroom nào có assignment này không (single query)
    const classroomId = await getStudentClassroomForAssignment(user.id, assignmentId);
    if (!classroomId) {
      return errorResponse(403, "Forbidden - Not a member of this assignment's classroom");
    }

    // Parse pagination params
    const url = new URL(req.url);
    const parsedQuery = getQuerySchema.safeParse({
      page: url.searchParams.get("page") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    });
    if (!parsedQuery.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ", {
        details: parsedQuery.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      });
    }

    const { page, limit } = parsedQuery.data;
    const skip = (page - 1) * limit;

    // OPTIMIZE: Query trực tiếp từ question_comments với join đến questions
    // Thay vì query questions trước rồi mới query comments (2 queries → 1 query)
    // Sử dụng raw query để join trực tiếp
    const [commentsRaw, total] = await Promise.all([
      // Lấy comments với question info trong một query
      prisma.questionComment.findMany({
        where: {
          question: {
            assignmentId,
          },
        },
        select: {
          id: true,
          content: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              fullname: true,
              email: true,
            },
          },
          question: {
            select: {
              id: true,
              content: true,
              order: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
      }),
      // Đếm tổng số comments
      prisma.questionComment.count({
        where: {
          question: {
            assignmentId,
          },
        },
      }),
    ]);

    const comments = commentsRaw as StudentAssignmentCommentRow[];

    // Transform data
    const commentsData = comments.map((comment: StudentAssignmentCommentRow) => ({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      user: comment.user,
      question: {
        id: comment.question.id,
        content: comment.question.content,
        order: comment.question.order,
      },
    }));

    return NextResponse.json(
      {
        success: true,
        data: {
          comments: commentsData,
          total,
          page,
          hasMore: skip + commentsData.length < total,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error(
      "[ERROR] [GET] /api/students/assignments/[id]/comments - Error:",
      error
    );
    return errorResponse(500, "Internal server error");
  }
}

/**
 * POST /api/students/assignments/[id]/comments
 * Tạo comment mới cho assignment (comment vào một question cụ thể)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Sử dụng getAuthenticatedUser với caching
    const user = await getAuthenticatedUser(req);
    if (!user) return errorResponse(401, "Unauthorized");
    if (user.role !== "STUDENT") return errorResponse(403, "Forbidden - Student role required");

    const parsedParams = paramsSchema.safeParse(params);
    if (!parsedParams.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ", {
        details: parsedParams.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      });
    }

    const assignmentId = parsedParams.data.id;

    // Membership check trước mọi thao tác tạo dữ liệu
    const classroomId = await getStudentClassroomForAssignment(user.id, assignmentId);
    if (!classroomId) {
      return errorResponse(403, "Forbidden - Not a member of this assignment's classroom");
    }

    const rawBody: unknown = await req.json().catch(() => null);
    const parsedBody = postBodySchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ", {
        details: parsedBody.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      });
    }

    const content = parsedBody.data.content.trim();
    const questionId = parsedBody.data.questionId;

    // POLICY: Không cho bình luận khi đang làm bài QUIZ
    // Chỉ cho phép sau khi đã nộp (có submission) HOẶC sau khi đến thời điểm lockAt/dueDate
    const [assignmentMeta, existingSubmission] = await Promise.all([
      prisma.assignment.findUnique({
        where: { id: assignmentId },
        select: { id: true, type: true, lockAt: true, dueDate: true },
      }),
      prisma.assignmentSubmission.findFirst({
        where: { assignmentId, studentId: user.id },
        select: { id: true },
      }),
    ]);

    if (!assignmentMeta) {
      return errorResponse(404, "Assignment not found");
    }

    if (assignmentMeta.type === "QUIZ") {
      const lockedAt = assignmentMeta.lockAt ?? assignmentMeta.dueDate;
      const now = new Date();
      const locked = lockedAt ? now > new Date(lockedAt) : false;
      const canComment = !!existingSubmission || locked;
      if (!canComment) {
        return errorResponse(
          403,
          "Bạn chỉ có thể bình luận sau khi nộp bài hoặc sau khi bài kiểm tra kết thúc."
        );
      }
    }

    // Cho phép thiếu questionId (đối với bài tự luận không có câu hỏi)

    let targetQuestionId = questionId || null;
    if (!targetQuestionId) {
      // Tạo/tìm câu hỏi thảo luận mặc định cho assignment tự luận
      const found = await prisma.question.findFirst({
        where: { assignmentId, order: 0, type: 'ESSAY', content: { startsWith: '[DISCUSSION]'} },
        select: { id: true },
      });
      if (found) targetQuestionId = found.id;
      else {
        const created = await prisma.question.create({
          data: { assignmentId, order: 0, type: 'ESSAY', content: '[DISCUSSION] Thảo luận chung' },
          select: { id: true },
        });
        targetQuestionId = created.id;
      }
    } else {
      // Validate question thuộc assignment
      const valid = await prisma.question.findFirst({ where: { id: targetQuestionId, assignmentId }, select: { id: true } });
      if (!valid) {
        return errorResponse(404, "Question not found or not belong to this assignment");
      }
    }

    // Tạo comment
    const comment = await prisma.questionComment.create({
      data: {
        questionId: targetQuestionId!,
        userId: user.id,
        content: content.trim(),
      },
      include: {
        user: {
          select: {
            id: true,
            fullname: true,
            email: true,
          },
        },
        question: {
          select: {
            id: true,
            content: true,
            order: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Comment created successfully",
        data: {
          id: comment.id,
          content: comment.content,
          createdAt: comment.createdAt.toISOString(),
          user: comment.user,
          question: {
            id: comment.question.id,
            content: comment.question.content,
            order: comment.question.order,
          },
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error(
      "[ERROR] [POST] /api/students/assignments/[id]/comments - Error:",
      error
    );
    return errorResponse(500, "Internal server error");
  }
}


