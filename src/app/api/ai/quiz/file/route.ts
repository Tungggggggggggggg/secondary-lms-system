import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth-options";
import { errorResponse } from "@/lib/api-utils";
import { checkRateLimit, getClientIp } from "@/lib/security/rateLimit";
import { extractTextFromFile } from "@/lib/files/extractTextFromFile";
import { generateQuizFromText } from "@/lib/ai/gemini-quiz";
import type { QuizQuestion } from "@/types/assignment-builder";

export const runtime = "nodejs";

const formSchema = z.object({
  numQuestions: z.number().int().min(1).max(30).optional(),
});

function rateLimitResponse(retryAfterSeconds: number) {
  return NextResponse.json(
    { success: false, error: true, message: "Too many requests", details: null, retryAfterSeconds },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
      },
    }
  );
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return errorResponse(403, "Forbidden - Teachers only");
    }

    const ip = getClientIp(req);

    const ipLimit = await checkRateLimit({
      scope: "ai_quiz_ip",
      key: ip,
      limit: 10,
      windowMs: 10 * 60 * 1000,
    });
    if (!ipLimit.allowed) {
      return rateLimitResponse(ipLimit.retryAfterSeconds);
    }

    const userLimit = await checkRateLimit({
      scope: "ai_quiz_teacher",
      key: session.user.id,
      limit: 10,
      windowMs: 10 * 60 * 1000,
    });
    if (!userLimit.allowed) {
      return rateLimitResponse(userLimit.retryAfterSeconds);
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return errorResponse(400, "Dữ liệu không hợp lệ", { details: "file is required" });
    }

    const numQuestionsRaw = form.get("numQuestions");
    const parsed = formSchema.safeParse({
      numQuestions:
        numQuestionsRaw === null || numQuestionsRaw === undefined || numQuestionsRaw === ""
          ? undefined
          : Number(numQuestionsRaw),
    });

    if (!parsed.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ", {
        details: parsed.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const extracted = await extractTextFromFile(file);

    const questionsRaw = await generateQuizFromText({
      sourceText: extracted.text,
      numQuestions: parsed.data.numQuestions ?? 10,
      language: "vi",
    });

    const mapped: QuizQuestion[] = questionsRaw.map((q, idx) => {
      const options = q.options.map((opt, j) => ({
        label: String.fromCharCode(65 + j),
        content: opt.text,
        isCorrect: !!opt.isCorrect,
      }));

      return {
        id: `ai_${Date.now()}_${idx}`,
        content: q.question,
        type: q.type,
        options,
        order: idx + 1,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        questions: mapped,
      },
    });
  } catch (error) {
    console.error("[API /api/ai/quiz/file] Error", error);

    if (error instanceof Error) {
      if (/GEMINI_API_KEY/i.test(error.message)) {
        return errorResponse(500, "Dịch vụ AI chưa được cấu hình.");
      }
      if (/Định dạng file không được hỗ trợ/i.test(error.message)) {
        return errorResponse(415, error.message);
      }
      if (/File quá lớn/i.test(error.message)) {
        return errorResponse(413, error.message);
      }
      if (/Không trích xuất được nội dung/i.test(error.message)) {
        return errorResponse(400, error.message);
      }
      if (
        /Phản hồi AI không đúng định dạng/i.test(error.message) ||
        /Không parse được JSON/i.test(error.message)
      ) {
        return errorResponse(502, "AI trả về dữ liệu không hợp lệ. Vui lòng thử lại.");
      }
      if (
        /models\//i.test(error.message) &&
        (/is not found/i.test(error.message) ||
          /not supported for generatecontent/i.test(error.message))
      ) {
        return errorResponse(502, "Dịch vụ AI đang tạm thời không khả dụng. Vui lòng thử lại sau.");
      }
      if (/không hỗ trợ các model/i.test(error.message)) {
        return errorResponse(502, "Dịch vụ AI đang tạm thời không khả dụng. Vui lòng thử lại sau.");
      }
    }

    return errorResponse(500, "Internal server error");
  }
}
