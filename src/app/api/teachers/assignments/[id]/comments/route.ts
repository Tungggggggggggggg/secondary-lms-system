import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { getAuthenticatedUser, isTeacherOfAssignment } from "@/lib/api-utils";

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
    const user = await getAuthenticatedUser(req, UserRole.TEACHER);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const assignmentId = params.id;

    // Kiểm tra teacher có sở hữu assignment không
    const isOwner = await isTeacherOfAssignment(user.id, assignmentId);
    if (!isOwner) {
      return NextResponse.json(
        { success: false, message: "Forbidden - Not your assignment" },
        { status: 403 }
      );
    }

    // Parse query params
    const url = req.url ? new URL(req.url, "http://localhost") : null;
    const questionId = url?.searchParams.get("questionId"); // Filter theo question cụ thể
    const studentId = url?.searchParams.get("studentId"); // Filter theo student cụ thể
    const page = url?.searchParams.get("page")
      ? Number(url.searchParams.get("page"))
      : 1;
    const limit = url?.searchParams.get("limit")
      ? Number(url.searchParams.get("limit"))
      : 50;
    const skip = (page - 1) * limit;

    // Xây dựng where clause
    const whereClause: any = {
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
    const commentsData = comments.map((comment) => ({
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

    console.log(
      `[INFO] [GET] /api/teachers/assignments/${assignmentId}/comments - Found ${commentsData.length} comments (total: ${total}, page: ${page})`
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
  } catch (error) {
    console.error(
      "[ERROR] [GET] /api/teachers/assignments/[id]/comments - Error:",
      error
    );
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

