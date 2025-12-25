import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { errorResponse, getAuthenticatedUser, getStudentClassroomForAssignment } from "@/lib/api-utils";

const paramsSchema = z
  .object({
    id: z.string().min(1).max(100),
  })
  .strict();

const antiCheatConfigSchema = z
  .object({
    showCorrectMode: z.enum(["never", "afterSubmit", "afterLock"]).optional(),
  })
  .passthrough();

interface QuizAnswerOptionRow {
  id: string;
  isCorrect: boolean;
}

interface QuizAnswerQuestionRow {
  id: string;
  options: QuizAnswerOptionRow[];
}

/**
 * GET /api/students/assignments/[id]/answers
 * Trả về danh sách đáp án đúng cho từng câu hỏi của bài QUIZ, chỉ khi thỏa chính sách hiển thị.
 * Chính sách lấy từ anti_cheat_config.showCorrectMode: "never" | "afterSubmit" | "afterLock" (default: never)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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

    // Kiểm tra membership
    const classroomId = await getStudentClassroomForAssignment(user.id, assignmentId);
    if (!classroomId) {
      return errorResponse(403, "Forbidden - Not a member of this assignment's classroom");
    }

    // Lấy meta assignment
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: {
        id: true,
        type: true,
        lockAt: true,
        dueDate: true,
        anti_cheat_config: true,
      },
    });

    if (!assignment) {
      return errorResponse(404, "Assignment not found");
    }

    if (assignment.type !== "QUIZ") {
      return errorResponse(400, "Only QUIZ supports answers reveal");
    }

    // Chính sách hiển thị đáp án đúng
    const cfgParsed = antiCheatConfigSchema.safeParse(assignment.anti_cheat_config ?? {});
    const mode = cfgParsed.success ? (cfgParsed.data.showCorrectMode ?? "never") : "never";

    if (mode === "never") {
      return errorResponse(403, "Answers reveal is disabled");
    }

    // Kiểm tra điều kiện thời điểm
    const now = new Date();
    const lockedAt = assignment.lockAt ?? assignment.dueDate;
    const locked = lockedAt ? now > new Date(lockedAt) : false;

    if (mode === "afterLock" && !locked) {
      return errorResponse(403, "Answers available after the quiz is closed");
    }

    if (mode === "afterSubmit") {
      // Yêu cầu đã có submission
      const sub = await prisma.assignmentSubmission.findFirst({
        where: { assignmentId, studentId: user.id },
        select: { id: true },
      });
      if (!sub) {
        return errorResponse(403, "Answers available after you submit this quiz");
      }
    }

    // Lấy đáp án đúng (IDs) cho từng câu
    const questions = (await prisma.question.findMany({
      where: { assignmentId },
      select: {
        id: true,
        options: { select: { id: true, isCorrect: true }, orderBy: { order: "asc" } },
      },
      orderBy: { order: "asc" },
    })) as QuizAnswerQuestionRow[];

    const data = questions.map((q: QuizAnswerQuestionRow) => ({
      questionId: q.id,
      correctOptionIds: q.options
        .filter((o: QuizAnswerOptionRow) => o.isCorrect)
        .map((o: QuizAnswerOptionRow) => o.id),
    }));

    return NextResponse.json(
      { success: true, data: { questions: data } },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("[ERROR] [GET] /api/students/assignments/[id]/answers - Error:", error);
    return errorResponse(500, "Internal server error");
  }
}
