import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, getStudentClassroomForAssignment } from "@/lib/api-utils";

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
    const user = await getAuthenticatedUser(req, "STUDENT");
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const assignmentId = params.id;

    // Kiểm tra membership
    const classroomId = await getStudentClassroomForAssignment(user.id, assignmentId);
    if (!classroomId) {
      return NextResponse.json(
        { success: false, message: "Forbidden - Not a member of this assignment's classroom" },
        { status: 403 }
      );
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
      return NextResponse.json({ success: false, message: "Assignment not found" }, { status: 404 });
    }

    if (assignment.type !== "QUIZ") {
      return NextResponse.json({ success: false, message: "Only QUIZ supports answers reveal" }, { status: 400 });
    }

    // Chính sách hiển thị đáp án đúng
    const cfg = (assignment.anti_cheat_config || {}) as any;
    const mode = (cfg?.showCorrectMode as string) || "never"; // never | afterSubmit | afterLock

    if (mode === "never") {
      return NextResponse.json({ success: false, message: "Answers reveal is disabled" }, { status: 403 });
    }

    // Kiểm tra điều kiện thời điểm
    const now = new Date();
    const lockedAt = assignment.lockAt ?? assignment.dueDate;
    const locked = lockedAt ? now > new Date(lockedAt) : false;

    if (mode === "afterLock" && !locked) {
      return NextResponse.json({ success: false, message: "Answers available after the quiz is closed" }, { status: 403 });
    }

    if (mode === "afterSubmit") {
      // Yêu cầu đã có submission
      const sub = await prisma.assignmentSubmission.findFirst({
        where: { assignmentId, studentId: user.id },
        select: { id: true },
      });
      if (!sub) {
        return NextResponse.json({ success: false, message: "Answers available after you submit this quiz" }, { status: 403 });
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
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
