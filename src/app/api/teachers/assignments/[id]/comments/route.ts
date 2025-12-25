import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { errorResponse, getAuthenticatedUser, isTeacherOfAssignment } from "@/lib/api-utils";

const querySchema = z.object({
  questionId: z.string().min(1).optional(),
  studentId: z.string().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

interface TeacherAssignmentCommentRow {
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
 * GET /api/teachers/assignments/[id]/comments
 * Teacher xem tất cả comments của học sinh trong assignment
 * Teacher có thể xem tất cả comments, không bị giới hạn như student
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Sử dụng getAuthenticatedUser với caching
    const user = await getAuthenticatedUser(req);
    if (!user) return errorResponse(401, "Unauthorized");
    if (user.role !== "TEACHER") return errorResponse(403, "Forbidden");

    const assignmentId = params.id;

    // Kiểm tra teacher có sở hữu assignment không
    const isOwner = await isTeacherOfAssignment(user.id, assignmentId);
    if (!isOwner) {
      return errorResponse(403, "Forbidden - Not your assignment");
    }

    // Parse query params
    const url = new URL(req.url);
    const parsedQuery = querySchema.safeParse({
      questionId: url.searchParams.get("questionId") || undefined,
      studentId: url.searchParams.get("studentId") || undefined,
      page: url.searchParams.get("page") || undefined,
      limit: url.searchParams.get("limit") || undefined,
    });
    if (!parsedQuery.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ", {
        details: parsedQuery.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      });
    }

    const { questionId, studentId, page, limit } = parsedQuery.data;
    const skip = (page - 1) * limit;

    // Xây dựng where clause
    const whereClause: Prisma.QuestionCommentWhereInput = {
      question: {
        assignmentId,
      },
    };

    if (questionId) {
      whereClause.questionId = questionId;
    }

    if (studentId) {
      whereClause.userId = studentId;
    }

    // Parallel queries: Count và fetch comments
    const [total, comments] = await Promise.all([
      prisma.questionComment.count({
        where: whereClause,
      }),
      prisma.questionComment.findMany({
        where: whereClause,
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
    ]);

    // Transform data
    const commentsData = comments.map(
      (comment: TeacherAssignmentCommentRow) => ({
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt.toISOString(),
        user: comment.user,
        question: {
          id: comment.question.id,
          content: comment.question.content,
          order: comment.question.order,
        },
      }),
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          comments: commentsData,
          total,
          page,
          limit,
          hasMore: skip + commentsData.length < total,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error(
      "[ERROR] [GET] /api/teachers/assignments/[id]/comments - Error:",
      error
    );
    return errorResponse(500, "Internal server error");
  }
}

