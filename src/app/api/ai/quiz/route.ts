import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { generateQuizFromText } from "@/lib/ai/gemini-quiz";
import type { QuizQuestion } from "@/types/assignment-builder";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return NextResponse.json(
        { success: false, message: "Forbidden - Teachers only" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    const sourceText = (body?.sourceText || "").toString();
    const numQuestions = Number(body?.numQuestions) || 10;

    if (!sourceText.trim()) {
      return NextResponse.json(
        { success: false, message: "sourceText is required" },
        { status: 400 }
      );
    }

    const questionsRaw = await generateQuizFromText({
      sourceText,
      numQuestions: Math.max(1, Math.min(numQuestions, 30)),
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
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Internal server error";
    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 }
    );
  }
}
