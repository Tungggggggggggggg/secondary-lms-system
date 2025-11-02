import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { getAuthenticatedUser, getStudentClassroomForAssignment } from "@/lib/api-utils";

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

    // Parse pagination params
    const url = req.url ? new URL(req.url, "http://localhost") : null;
    const page = url?.searchParams.get("page")
      ? Number(url.searchParams.get("page"))
      : 1;
    const limit = url?.searchParams.get("limit")
      ? Number(url.searchParams.get("limit"))
      : 20;
    const skip = (page - 1) * limit;

    // OPTIMIZE: Query trực tiếp từ question_comments với join đến questions
    // Thay vì query questions trước rồi mới query comments (2 queries → 1 query)
    // Sử dụng raw query để join trực tiếp
    const [comments, total] = await Promise.all([
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
      `[INFO] [GET] /api/students/assignments/${assignmentId}/comments - Found ${commentsData.length} comments (page ${page}, total: ${total})`
    );

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
  } catch (error) {
    console.error(
      "[ERROR] [GET] /api/students/assignments/[id]/comments - Error:",
      error
    );
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
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
    const user = await getAuthenticatedUser(req, UserRole.STUDENT);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const assignmentId = params.id;
    const body = await req.json();
    const { content, questionId } = body as {
      content?: string;
      questionId?: string;
    };

    if (!content || !content.trim()) {
      return NextResponse.json(
        { success: false, message: "Content is required" },
        { status: 400 }
      );
    }

    if (!questionId) {
      return NextResponse.json(
        { success: false, message: "questionId is required" },
        { status: 400 }
      );
    }

    // Optimize: Parallel queries - Kiểm tra classroom membership + question validation
    const [classroomId, question] = await Promise.all([
      getStudentClassroomForAssignment(user.id, assignmentId),
      prisma.question.findFirst({
        where: {
          id: questionId,
          assignmentId,
        },
        select: {
          id: true,
          content: true,
          order: true,
        },
      }),
    ]);

    if (!classroomId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden - Not a member of this assignment's classroom",
        },
        { status: 403 }
      );
    }

    if (!question) {
      return NextResponse.json(
        { success: false, message: "Question not found or not belong to this assignment" },
        { status: 404 }
      );
    }

    // Tạo comment
    const comment = await prisma.questionComment.create({
      data: {
        questionId,
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

    console.log(
      `[INFO] [POST] /api/students/assignments/${assignmentId}/comments - Student ${user.id} created comment on question ${questionId}`
    );

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
  } catch (error) {
    console.error(
      "[ERROR] [POST] /api/students/assignments/[id]/comments - Error:",
      error
    );
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}


