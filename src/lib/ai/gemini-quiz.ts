import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

const QuizOptionSchema = z.object({
  text: z.string(),
  isCorrect: z.boolean(),
});

const QuizQuestionSchema = z.object({
  question: z.string(),
  type: z.enum(["SINGLE", "MULTIPLE", "TRUE_FALSE"]).default("SINGLE"),
  options: z.array(QuizOptionSchema).min(2),
});

const QuizResponseSchema = z.object({
  questions: z.array(QuizQuestionSchema).min(1),
});

export type GeneratedQuizQuestion = z.infer<typeof QuizQuestionSchema>;

interface GenerateQuizParams {
  sourceText: string;
  numQuestions?: number;
  language?: "vi" | "en";
}

function tryParseJsonCandidate(candidate: string): unknown | undefined {
  try {
    return JSON.parse(candidate);
  } catch {
    // Thử loại bỏ dấu phẩy thừa trước } hoặc ] rồi parse lại
    const sanitized = candidate.replace(/,\s*([}\]])/g, "$1");
    try {
      return JSON.parse(sanitized);
    } catch {
      return undefined;
    }
  }
}

function extractQuestionsFromText(text: string): GeneratedQuizQuestion[] {
  const questions: GeneratedQuizQuestion[] = [];

  // Chia text thành các block theo từng "question": ...
  const blockRegex = /"question"\s*:\s*"([^\"]+)"([\s\S]*?)(?="question"\s*:\s*"|$)/g;

  let blockMatch: RegExpExecArray | null;
  while ((blockMatch = blockRegex.exec(text)) !== null) {
    const questionText = blockMatch[1].trim();
    const blockBody = blockMatch[2];

    // Tìm type trong block, mặc định SINGLE nếu thiếu hoặc sai
    const typeMatch = /"type"\s*:\s*"(SINGLE|MULTIPLE|TRUE_FALSE)"/i.exec(blockBody);
    const rawType = typeMatch?.[1]?.toUpperCase() ?? "SINGLE";
    const type: GeneratedQuizQuestion["type"] =
      rawType === "MULTIPLE" || rawType === "TRUE_FALSE" ? (rawType as any) : "SINGLE";

    // Tìm tất cả options trong block; không phụ thuộc vào mảng hay dấu ] đầy đủ
    const options: { text: string; isCorrect: boolean }[] = [];
    const optionRegex =
      /"text"\s*:\s*"([^\"]+)"[\s\S]*?"isCorrect"\s*:\s*(true|false)/g;

    let oMatch: RegExpExecArray | null;
    while ((oMatch = optionRegex.exec(blockBody)) !== null) {
      const optText = oMatch[1].trim();
      const isCorrect = oMatch[2] === "true";
      if (!optText) continue;
      options.push({ text: optText, isCorrect });
    }

    if (questionText && options.length >= 2) {
      questions.push({ question: questionText, type, options });
    }
  }

  return questions;
}

function normalizeQuestionsFromParsed(parsed: any): GeneratedQuizQuestion[] {
  const rawQuestions = Array.isArray(parsed?.questions)
    ? parsed.questions
    : Array.isArray(parsed)
    ? parsed
    : [];

  const questions: GeneratedQuizQuestion[] = [];

  for (const q of rawQuestions) {
    if (!q || typeof q !== "object") continue;

    const content = typeof q.question === "string" ? q.question.trim() : "";
    if (!content) continue;

    const rawType = typeof q.type === "string" ? q.type.toUpperCase() : "SINGLE";
    const type: GeneratedQuizQuestion["type"] =
      rawType === "MULTIPLE" || rawType === "TRUE_FALSE" ? (rawType as any) : "SINGLE";

    const rawOptions = Array.isArray(q.options) ? q.options : [];
    const options = rawOptions
      .map((o: any) => {
        const text = typeof o?.text === "string" ? o.text.trim() : "";
        if (!text) return null;
        const isCorrect = typeof o?.isCorrect === "boolean" ? o.isCorrect : false;
        return { text, isCorrect };
      })
      .filter(
        (
          o: { text: string; isCorrect: boolean } | null
        ): o is { text: string; isCorrect: boolean } => !!o
      );

    if (options.length < 2) continue;

    questions.push({ question: content, type, options });
  }

  return questions;
}

function parseJsonFromGeminiText(text: string): unknown {
  // Thử parse trực tiếp trước (kèm sanitize trailing comma)
  const direct = tryParseJsonCandidate(text);
  if (typeof direct !== "undefined") return direct;

  // Nếu model trả về trong ```json ...``` thì trích ra phần bên trong
  const fenced = text.match(/```(?:json)?([\s\S]*?)```/i);
  if (fenced && fenced[1]) {
    const inner = fenced[1].trim();
    const parsedInner = tryParseJsonCandidate(inner);
    if (typeof parsedInner !== "undefined") return parsedInner;
  }

  // Fallback: lấy đoạn từ { đầu tiên tới } cuối cùng và thử parse
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    const candidate = text.slice(start, end + 1);
    const parsedCandidate = tryParseJsonCandidate(candidate);
    if (typeof parsedCandidate !== "undefined") return parsedCandidate;
  }

  const truncated = text.slice(0, 500);
  console.error(
    "[GeminiQuiz] Không parse được JSON từ phản hồi AI. Raw (truncated):",
    truncated
  );
  throw new Error(
    "Không parse được JSON từ phản hồi AI. Raw (truncated): " + truncated
  );
}

export async function generateQuizFromText(
  params: GenerateQuizParams
): Promise<GeneratedQuizQuestion[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Thiếu cấu hình GEMINI_API_KEY trong biến môi trường.");
  }

  const { sourceText, numQuestions = 10, language = "vi" } = params;
  const targetCount = Math.min(Math.max(numQuestions, 1), 60);

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const systemPrompt = [
    "Bạn là trợ lý tạo đề thi trắc nghiệm cho học sinh THCS.",
    "Hãy tạo câu hỏi trắc nghiệm dựa trên nội dung bài học được cung cấp.",
    "",
    "Đầu ra PHẢI tuân thủ chính xác format sau, không thêm bất kỳ giải thích hay văn bản thừa nào:",
    "",
    "QUESTION: <nội dung câu hỏi 1>",
    "- [x] <đáp án đúng>",
    "- [ ] <đáp án sai>",
    "- [ ] <đáp án sai>",
    "END_QUESTION",
    "QUESTION: <nội dung câu hỏi 2>",
    "- [ ] <đáp án sai>",
    "- [x] <đáp án đúng>",
    "- [ ] <đáp án sai>",
    "END_QUESTION",
    "",
    "Quy tắc:",
    "- Mỗi câu hỏi có ít nhất 3 đáp án.",
    "- Đánh dấu đáp án đúng bằng [x], đáp án sai bằng [ ].",
    "- Không thêm số thứ tự, không thêm tiêu đề hoặc chú thích khác.",
    "- Chỉ dùng tiếng Việt cho nội dung câu hỏi và đáp án.",
  ].join("\n");
  // Helper: chuẩn hoá nội dung câu hỏi để so trùng
  const normalize = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();

  const allQuestions: GeneratedQuizQuestion[] = [];
  const seen = new Set<string>();

  const maxRounds = 3;

  for (let round = 0; round < maxRounds && allQuestions.length < targetCount; round++) {
    const remaining = targetCount - allQuestions.length;

    const existingList = allQuestions.map((q, idx) => `${idx + 1}. ${q.question}`).join("\n");

    const userPrompt = [
      `Ngôn ngữ câu hỏi: ${language === "vi" ? "Tiếng Việt" : "English"}.`,
      allQuestions.length
        ? `Hiện đã có ${allQuestions.length} câu hỏi. Hãy tạo THÊM CHÍNH XÁC ${remaining} câu hỏi trắc nghiệm MỚI, không ít hơn, không nhiều hơn, và KHÔNG TRÙNG với bất kỳ câu nào sau đây:`
        : `Hãy tạo CHÍNH XÁC ${remaining} câu hỏi trắc nghiệm, không ít hơn, không nhiều hơn. Các câu hỏi phải KHÔNG TRÙNG NHAU.`,
      allQuestions.length ? existingList : undefined,
      "Nội dung bài học (dùng để sinh câu hỏi):",
      sourceText,
    ]
      .filter(Boolean)
      .join("\n\n");

    const result = await model.generateContent({
      contents: [
        { role: "user", parts: [{ text: systemPrompt + "\n\n" + userPrompt }] },
      ],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 2048,
      },
    });

    const rawText = result.response.text();

    // Parse format QUESTION / END_QUESTION với các dòng - [x]/- [ ]
    const blocks = rawText
      .split(/QUESTION:/i)
      .map((b) => b.trim())
      .filter(Boolean);

    let addedThisRound = 0;

    for (const block of blocks) {
      const lines = block.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (!lines.length) continue;

      const questionText = lines[0];
      const options: { text: string; isCorrect: boolean }[] = [];

      for (const line of lines.slice(1)) {
        if (/^END_QUESTION/i.test(line)) break;
        // Chấp nhận cả dạng [x] (đúng) và [ ] (sai) trong ngoặc vuông
        const m = /^-\s*\[([^\]]*)\]\s*(.+)$/.exec(line);
        if (!m) continue;
        const flagRaw = (m[1] || "").trim().toLowerCase();
        const isCorrect = flagRaw === "x" || flagRaw === "✓";
        const text = m[2].trim();
        if (!text) continue;
        options.push({ text, isCorrect });
      }

      if (!questionText || options.length < 2) continue;

      // Đảm bảo có ít nhất 1 đáp án đúng
      if (!options.some((o) => o.isCorrect)) {
        options[0].isCorrect = true;
      }

      const correctCount = options.filter((o) => o.isCorrect).length;
      const type: GeneratedQuizQuestion["type"] =
        correctCount > 1 ? "MULTIPLE" : "SINGLE";

      const key = normalize(questionText);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      allQuestions.push({ question: questionText, type, options });
      addedThisRound++;

      if (allQuestions.length >= targetCount) break;
    }

    if (addedThisRound === 0) {
      // Không thu được câu hỏi mới ở vòng này -> dừng để tránh lặp vô hạn
      break;
    }
  }

  if (allQuestions.length < targetCount) {
    throw new Error(
      `AI chỉ tạo được ${allQuestions.length}/${targetCount} câu hỏi từ nội dung này. ` +
        "Hãy giảm số câu hỏi mong muốn hoặc rút gọn/làm rõ nội dung bài học."
    );
  }

  return allQuestions.slice(0, targetCount);
}
