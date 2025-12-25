import { z } from "zod";
import type { AssignmentData, QuizQuestion } from "@/types/assignment-builder";

export type Step = "type" | "basic" | "content" | "classrooms" | "preview";

export type StepValidation = {
  ok: boolean;
  items: { ok: boolean; label: string }[];
};

const submissionFormatSchema = z.enum(["TEXT", "FILE", "BOTH"]);

const baseQuestionSchema = z.object({
  id: z.string(),
  content: z.string().trim(),
  type: z.enum(["SINGLE", "MULTIPLE", "TRUE_FALSE", "FILL_BLANK"]),
  options: z
    .array(
      z.object({
        label: z.string(),
        content: z.string().optional().default(""),
        isCorrect: z.boolean().optional().default(false),
      })
    )
    .default([]),
});

const quizSchema = z.object({
  questions: z.array(baseQuestionSchema).min(1),
  timeLimitMinutes: z.number().int().min(5).max(300),
  openAt: z.date(),
  lockAt: z.date(),
  maxAttempts: z.number().int().min(1),
});

const essaySchema = z.object({
  question: z.string().trim().min(1),
  submissionFormat: submissionFormatSchema,
  openAt: z.date(),
  dueDate: z.date(),
});

function validateEssay(data?: AssignmentData["essayContent"]): StepValidation {
  const items: StepValidation["items"] = [];
  if (!data) return { ok: false, items: [{ ok: false, label: "Chưa có nội dung bài tự luận" }] };

  const parsed = essaySchema.safeParse(data);
  items.push({ ok: !!data.question?.trim(), label: "Câu hỏi đã nhập" });
  items.push({ ok: !!data.openAt, label: "Đã đặt thời gian mở" });
  items.push({ ok: !!data.dueDate, label: "Đã đặt hạn nộp" });
  if (data.openAt && data.dueDate) {
    items.push({ ok: data.openAt < data.dueDate, label: "Mở trước hạn nộp" });
  }
  const ok = parsed.success && items.every((i) => i.ok);
  return { ok, items };
}

function validateSingleQuestionRules(q: QuizQuestion): boolean {
  if (q.type === "FILL_BLANK") {
    const valid = (q.options || []).filter((o) => (o.content || "").trim() !== "").length >= 1;
    return valid;
  }
  if (q.type === "MULTIPLE") {
    // at least one true, no further constraints
    return (q.options || []).some((o) => o.isCorrect === true);
  }
  // SINGLE | TRUE_FALSE: exactly 1 true
  const cnt = (q.options || []).filter((o) => o.isCorrect === true).length;
  return cnt === 1;
}

function validateQuiz(data?: AssignmentData["quizContent"]): StepValidation {
  const items: StepValidation["items"] = [];
  if (!data)
    return { ok: false, items: [{ ok: false, label: "Chưa có nội dung bài trắc nghiệm" }] };

  const parsed = quizSchema.safeParse(data);
  items.push({ ok: (data.questions || []).length > 0, label: "Có ít nhất 1 câu hỏi" });
  items.push({ ok: !!data.openAt, label: "Đã đặt thời gian mở" });
  items.push({ ok: !!data.lockAt, label: "Đã đặt thời gian đóng" });
  if (data.openAt && data.lockAt) {
    items.push({ ok: data.openAt < data.lockAt, label: "Mở trước khi đóng" });
  }

  // Per-question rules
  const perQuestionOk = (data.questions || []).every(validateSingleQuestionRules);
  items.push({ ok: perQuestionOk, label: "Mỗi câu hỏi đạt yêu cầu theo loại" });

  const ok = parsed.success && items.every((i) => i.ok);
  return { ok, items };
}

export function buildStepValidation(step: Step, data: AssignmentData): StepValidation {
  if (step === "type") {
    const items = [{ ok: !!data.type, label: "Đã chọn loại bài tập" }];
    return { ok: items.every((i) => i.ok), items };
  }
  if (step === "basic") {
    const items = [
      { ok: !!data.title?.trim(), label: "Tên bài tập không rỗng" },
    ];
    return { ok: items.every((i) => i.ok), items };
  }
  if (step === "content") {
    if (data.type === "ESSAY") return validateEssay(data.essayContent);
    return validateQuiz(data.quizContent);
  }
  if (step === "preview") {
    // tổng hợp
    const t = buildStepValidation("type", data).ok;
    const b = buildStepValidation("basic", data).ok;
    const c = buildStepValidation("content", data).ok;
    const items = [
      { ok: t, label: "Loại bài tập hợp lệ" },
      { ok: b, label: "Thông tin cơ bản hợp lệ" },
      { ok: c, label: "Nội dung hợp lệ" },
    ];
    return { ok: items.every((i) => i.ok), items };
  }
  // classrooms optional
  return { ok: true, items: [{ ok: true, label: "Lớp học (tuỳ chọn)" }] };
}
