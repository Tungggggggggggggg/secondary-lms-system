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
  } catch (error: unknown) {
    console.error(
      "[ERROR] [GET] /api/students/assignments/[id]/comments - Error:",
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
      return NextResponse.json(
        { success: false, message: "Assignment not found" },
        { status: 404 }
      );
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

    // Cho phép thiếu questionId (đối với bài tự luận không có câu hỏi)

    // Optimize: Parallel queries - Kiểm tra classroom membership + question validation
    const classroomId = await getStudentClassroomForAssignment(user.id, assignmentId);
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
        return NextResponse.json(
          { success: false, message: "Question not found or not belong to this assignment" },
          { status: 404 }
        );
      }
    }

    if (!classroomId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden - Not a member of this assignment's classroom",
        },
        { status: 403 }
      );
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

    console.log(
      `[INFO] [POST] /api/students/assignments/${assignmentId}/comments - Student ${user.id} created comment on question ${targetQuestionId}`
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
  } catch (error: unknown) {
    console.error(
      "[ERROR] [POST] /api/students/assignments/[id]/comments - Error:",
      error
    );
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}


