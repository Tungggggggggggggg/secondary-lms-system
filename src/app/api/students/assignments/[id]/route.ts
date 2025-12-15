import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { errorResponse, getAuthenticatedUser, getStudentClassroomForAssignment } from "@/lib/api-utils";

const paramsSchema = z
  .object({
    id: z.string().min(1).max(100),
  })
  .strict();

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
      return errorResponse(404, "Assignment not found");
    }

    if (!classroom) {
      return errorResponse(404, "Classroom not found");
    }

    // Transform data để trả về (kèm submission)
    const computedLatestAttempt = Math.max(submission?.attempt ?? 0, latestAttemptRow?.attemptNumber ?? 0);
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
        id: assignmentData.author.id,
        fullname: assignmentData.author.fullname,
        email: assignmentData.author.email,
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
      questions: assignmentData.questions.map((q) => ({
        id: q.id,
        content: q.content,
        type: q.type,
        order: q.order,
        options: q.options.map((opt) => ({
          id: opt.id,
          label: opt.label,
          content: opt.content,
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
            submittedAt: submission.submittedAt.toISOString(),
            attempt: submission.attempt,
            presentation: submission.presentation ?? null,
            contentSnapshot: submission.contentSnapshot ?? null,
          }
        : null,
    };

    return NextResponse.json(
      { success: true, data: assignmentDetail },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error(
      "[ERROR] [GET] /api/students/assignments/[id] - Error:",
      error
    );
    return errorResponse(500, "Internal server error");
  }
}


