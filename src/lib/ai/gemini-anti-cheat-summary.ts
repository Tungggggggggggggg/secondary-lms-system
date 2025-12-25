import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import {
  generateContentWithModelFallback,
  getDefaultFastModelCandidates,
} from "./geminiModelFallback";
import { formatZodIssues, parseJsonFromGeminiText } from "./geminiJson";

const AntiCheatSummarySchema = z.object({
  title: z.string().min(1).max(120),
  summary: z.string().min(1).max(2000),
  keySignals: z.array(z.string().min(1).max(200)).max(10).default([]),
  recommendations: z.array(z.string().min(1).max(240)).max(10).default([]),
});

export type AntiCheatAiSummary = z.infer<typeof AntiCheatSummarySchema>;

export type AntiCheatEventSnapshotItem = {
  at: string;
  type: string;
  meta?: Record<string, unknown> | null;
};

export type GenerateAntiCheatSummaryParams = {
  assignmentTitle: string;
  studentName: string;
  attemptNumber: number | null;
  suspicionScore: number;
  riskLevel: "low" | "medium" | "high";
  breakdown: Array<{ ruleId: string; title: string; count: number; points: number; maxPoints: number }>;
  events: AntiCheatEventSnapshotItem[];
};

function clipText(input: string, maxLen: number): string {
  const s = (input || "").trim();
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen);
}

/**
 * Sinh tóm tắt chống gian lận cho giáo viên dựa trên logs exam events đã thu thập.
 *
 * Input là dữ liệu đã được server-side giới hạn (assignment + student + attempt).
 * Output được parse + validate bằng zod.
 */
export async function generateAntiCheatAiSummary(
  params: GenerateAntiCheatSummaryParams
): Promise<AntiCheatAiSummary> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Thiếu cấu hình GEMINI_API_KEY trong biến môi trường.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelCandidates = getDefaultFastModelCandidates();

  const systemPrompt = [
    "Bạn là trợ lý hỗ trợ giáo viên rà soát chống gian lận cho bài quiz.",
    "Nhiệm vụ: tóm tắt logs sự kiện trong lúc học sinh làm bài, theo dữ liệu được cung cấp.",
    "Không suy đoán thông tin không có trong dữ liệu.",
    "Không hướng dẫn gian lận.",
    "Chỉ trả về DUY NHẤT một JSON object, không thêm markdown, không thêm giải thích ngoài JSON.",
    "Schema output bắt buộc:",
    "{",
    '  "title": string,',
    '  "summary": string,',
    '  "keySignals": string[],',
    '  "recommendations": string[]',
    "}",
    "Ngôn ngữ: tiếng Việt. Văn phong: ngắn gọn, trung lập, có tính hỗ trợ giáo viên.",
  ].join("\n");

  const safePayload = {
    assignmentTitle: clipText(params.assignmentTitle, 140),
    studentName: clipText(params.studentName, 80),
    attemptNumber: params.attemptNumber,
    score: {
      suspicionScore: Math.min(100, Math.max(0, Math.floor(params.suspicionScore))),
      riskLevel: params.riskLevel,
      breakdown: params.breakdown
        .slice(0, 20)
        .map((b) => ({
          ruleId: clipText(b.ruleId, 40),
          title: clipText(b.title, 80),
          count: Math.max(0, Math.floor(b.count)),
          points: Math.min(100, Math.max(0, Math.floor(b.points))),
          maxPoints: Math.min(100, Math.max(0, Math.floor(b.maxPoints))),
        })),
    },
    events: params.events
      .slice(0, 250)
      .map((e) => ({
        at: clipText(e.at, 40),
        type: clipText(e.type, 40),
        meta: e.meta ? e.meta : null,
      })),
  };

  const userPrompt = ["Dữ liệu chống gian lận (JSON):", JSON.stringify(safePayload)].join("\n");

  const { result } = await generateContentWithModelFallback(genAI, {
    modelCandidates,
    systemInstruction: systemPrompt,
    request: {
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1024,
        responseMimeType: "application/json",
      },
    },
  });

  const rawText = result.response.text();
  const parsed = parseJsonFromGeminiText(rawText);
  const validated = AntiCheatSummarySchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error("Phản hồi AI không đúng định dạng: " + formatZodIssues(validated.error.issues));
  }
  return validated.data;
}
