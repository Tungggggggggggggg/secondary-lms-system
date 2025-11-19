import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { getAuthenticatedUser, getStudentAssignmentForQuestion } from "@/lib/api-utils";

/**
 * GET /api/students/questions/[id]/comments
 * Lấy comments của question (pagination)
 * OPTIMIZED: Sử dụng helper function để giảm nested includes
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

    const questionId = params.id;

    // Optimize: Kiểm tra student có trong classroom nào có question này không (single query)
    const assignmentId = await getStudentAssignmentForQuestion(user.id, questionId);
    if (!assignmentId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden - Not a member of this assignment's classroom",
        },
        { status: 403 }
      );
    }

    // POLICY: Không cho bình luận khi đang làm bài QUIZ
    // Chỉ cho phép sau khi đã nộp (có submission) HOẶC sau khi đến thời điểm lockAt/dueDate
    const [assignmentMeta, existingSubmission] = await Promise.all([
      prisma.assignment.findUnique({ where: { id: assignmentId }, select: { id: true, type: true, lockAt: true, dueDate: true } }),
      prisma.assignmentSubmission.findFirst({ where: { assignmentId, studentId: user.id }, select: { id: true } }),
    ]);
    if (!assignmentMeta) {
      return NextResponse.json({ success: false, message: "Assignment not found" }, { status: 404 });
    }
    if (assignmentMeta.type === "QUIZ") {
      const lockedAt = assignmentMeta.lockAt ?? assignmentMeta.dueDate;
      const now = new Date();
      const locked = lockedAt ? now > new Date(lockedAt) : false;
      const canComment = !!existingSubmission || locked;
      if (!canComment) {
        return NextResponse.json(
          { success: false, message: "Bạn chỉ có thể bình luận sau khi nộp bài hoặc sau khi bài kiểm tra kết thúc." },
          { status: 403 }
        );
      }
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

    // Parallel queries: Count và fetch comments
    const [total, comments] = await Promise.all([
      prisma.questionComment.count({
        where: { questionId },
      }),
      prisma.questionComment.findMany({
        where: { questionId },
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
    }));

    console.log(
      `[INFO] [GET] /api/students/questions/${questionId}/comments - Found ${commentsData.length} comments (page ${page})`
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
  } catch (error: unknown) {
    console.error(
      "[ERROR] [GET] /api/students/questions/[id]/comments - Error:",
      error
    );
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST /api/students/questions/[id]/comments
 * Tạo comment mới cho question
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

    const questionId = params.id;
    const body = await req.json();
    const { content } = body as { content?: string };

    if (!content || !content.trim()) {
      return NextResponse.json(
        { success: false, message: "Content is required" },
        { status: 400 }
      );
    }

    // Optimize: Kiểm tra student có trong classroom nào có question này không (single query)
    const assignmentId = await getStudentAssignmentForQuestion(user.id, questionId);
    if (!assignmentId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden - Not a member of this assignment's classroom",
        },
        { status: 403 }
      );
    }

    // Verify question exists (lightweight check)
    const questionExists = await prisma.question.findFirst({
      where: {
        id: questionId,
        assignmentId,
      },
      select: { id: true },
    });

    if (!questionExists) {
      return NextResponse.json(
        { success: false, message: "Question not found" },
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
      },
    });

    console.log(
      `[INFO] [POST] /api/students/questions/${questionId}/comments - Student ${user.id} created comment`
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
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error(
      "[ERROR] [POST] /api/students/questions/[id]/comments - Error:",
      error
    );
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}


