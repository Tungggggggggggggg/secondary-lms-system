import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, getStudentClassroomForAssignment } from "@/lib/api-utils";

interface StudentAssignmentQuestionRow {
  id: string;
  content: string;
  type: string;
  order: number | null;
  options: unknown;
  _count: {
    comments: number;
  };
}

/**
 * GET /api/students/assignments/[id]
 * Lấy chi tiết assignment cho student (bao gồm questions, options nhưng KHÔNG có isCorrect)
 * COMBINED: Cũng trả về submission của student nếu có (giảm từ 2 requests xuống 1)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Sử dụng getAuthenticatedUser với caching
    const user = await getAuthenticatedUser(req, "STUDENT");
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

    // Parallel queries: Assignment detail + Submission + Classroom info trong cùng lúc
    const [assignmentData, submission, classroom, latestAttemptRow] = await Promise.all([
      // Lấy assignment detail
      prisma.assignment.findUnique({
        where: { id: assignmentId },
        select: {
          id: true,
          title: true,
          description: true,
          type: true,
          dueDate: true,
          createdAt: true,
          updatedAt: true,
          openAt: true,
          lockAt: true,
          timeLimitMinutes: true,
          submission_format: true,
          max_attempts: true,
          anti_cheat_config: true,
          author: {
            select: {
              id: true,
              fullname: true,
              email: true,
            },
          },
          questions: {
            select: {
              id: true,
              type: true,
              content: true,
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
              comments: {
                select: {
                  id: true,
                },
              },
            },
            orderBy: { order: "asc" },
          },
        },
      }),
      // Lấy submission của student (nếu có)
      prisma.assignmentSubmission.findFirst({
        where: { assignmentId, studentId: user.id },
        orderBy: { submittedAt: "desc" },
        select: {
          id: true,
          content: true,
          grade: true,
          feedback: true,
          submittedAt: true,
          attempt: true,
          presentation: true,
          contentSnapshot: true,
        },
      }),
      // Lấy classroom info
      prisma.classroom.findUnique({
        where: { id: classroomId },
        select: {
          id: true,
          name: true,
          code: true,
          icon: true,
          teacher: {
            select: {
              id: true,
              fullname: true,
              email: true,
            },
          },
        },
      }),
      // Lấy latest attempt
      prisma.assignmentAttempt.findFirst({
        where: { assignmentId, studentId: user.id },
        orderBy: { attemptNumber: "desc" },
        select: { attemptNumber: true },
      }),
    ]);

    if (!assignmentData) {
      return NextResponse.json(
        { success: false, message: "Assignment not found" },
        { status: 404 }
      );
    }

    if (!classroom) {
      return NextResponse.json(
        { success: false, message: "Classroom not found" },
        { status: 404 }
      );
    }

    // Transform data để trả về (kèm submission)
    const computedLatestAttempt = Math.max(submission?.attempt ?? 0, latestAttemptRow?.attemptNumber ?? 0);
    // Dùng biến trung gian để tránh lỗi type khi truy cập quan hệ questions
    const questions: any[] = (assignmentData as any).questions ?? [];
    const assignmentDetail = {
      id: assignmentData.id,
      title: assignmentData.title,
      description: assignmentData.description,
      dueDate: assignmentData.dueDate,
      type: assignmentData.type,
      openAt: assignmentData.openAt,
      lockAt: assignmentData.lockAt,
      timeLimitMinutes: assignmentData.timeLimitMinutes,
      submissionFormat: assignmentData.submission_format,
      maxAttempts: assignmentData.type === "QUIZ" ? assignmentData.max_attempts : null,
      antiCheatConfig: assignmentData.anti_cheat_config,
      createdAt: assignmentData.createdAt,
      updatedAt: assignmentData.updatedAt,
      author: {
        id: (assignmentData as any).author.id,
        fullname: (assignmentData as any).author.fullname,
        email: (assignmentData as any).author.email,
      },
      classroom: {
        id: classroom.id,
        name: classroom.name,
        code: classroom.code,
        icon: classroom.icon,
        teacher: {
          id: classroom.teacher.id,
          fullname: classroom.teacher.fullname,
          email: classroom.teacher.email,
        },
      },
      questions: questions.map((q: any) => ({
        id: q.id,
        content: q.content,
        type: q.type,
        order: q.order,
        options: q.options.map((opt: any) => ({
          id: opt.id,
          label: opt.label,
          content: opt.content,
          isCorrect: opt.isCorrect,
          order: opt.order,
        })),
        _count: {
          comments: q.comments?.length || 0,
        },
      })),
      latestAttempt: computedLatestAttempt,
      allowNewAttempt:
        assignmentData.type === "QUIZ"
          ? (computedLatestAttempt < (assignmentData.max_attempts ?? 1))
          : false,
      // Include submission trong response (COMBINED)
      submission: submission
        ? {
            id: submission.id,
            content: submission.content,
            grade: submission.grade,
            feedback: submission.feedback,
            submittedAt: new Date(submission.submittedAt).toISOString(),
            attempt: submission.attempt,
            presentation: submission.presentation ?? null,
            contentSnapshot: submission.contentSnapshot ?? null,
          }
        : null,
    };

    console.log(
      `[INFO] [GET] /api/students/assignments/${assignmentId} - Student ${user.id} viewed assignment (with submission: ${!!submission})`
    );

    return NextResponse.json(
      { success: true, data: assignmentDetail },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error(
      "[ERROR] [GET] /api/students/assignments/[id] - Error:",
      error
    );
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}


