import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { generateQuizFromText } from "@/lib/ai/gemini-quiz";
import type { QuizQuestion } from "@/types/assignment-builder";
import { z } from "zod";
import { errorResponse } from "@/lib/api-utils";

const requestSchema = z.object({
  sourceText: z.string().min(1, "sourceText is required"),
  numQuestions: z.number().int().min(1).max(30).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return errorResponse(403, "Forbidden - Teachers only");
    }

    const body = await req.json().catch(() => null);
    const parsed = requestSchema.safeParse({
      sourceText: (body?.sourceText || "").toString(),
      numQuestions: body?.numQuestions === undefined ? undefined : Number(body?.numQuestions),
    });
    if (!parsed.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ", {
        details: parsed.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const sourceText = parsed.data.sourceText;
    const numQuestions = parsed.data.numQuestions ?? 10;

    const questionsRaw = await generateQuizFromText({
      sourceText,
      numQuestions,
      language: "vi",
    });

    // Map AI questions to QuizQuestion shape used in builder
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
    console.error("[API /api/ai/quiz] Error", error);
    return errorResponse(500, "Internal server error");
  }
}
