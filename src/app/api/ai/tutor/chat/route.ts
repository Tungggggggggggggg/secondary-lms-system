import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { errorResponse, getAuthenticatedUser, isStudentInClassroom } from "@/lib/api-utils";
import { checkRateLimit, getClientIp } from "@/lib/security/rateLimit";
import { DEFAULT_EMBEDDING_DIMENSIONALITY, embedTextWithGemini } from "@/lib/ai/gemini-embedding";
import {
  createGeminiClient,
  generateContentWithModelFallback,
  getDefaultFastModelCandidates,
} from "@/lib/ai/geminiModelFallback";

export const runtime = "nodejs";

const requestSchema = z.object({
  classId: z.string().min(1),
  message: z.string().min(1).max(2000),
  lessonId: z.string().min(1).optional(),
  topK: z.number().int().min(1).max(10).optional().default(5),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(2000),
      })
    )
    .max(20)
    .optional()
    .default([]),
});

function rateLimitResponse(retryAfterSeconds: number) {
  return NextResponse.json(
    { success: false, error: true, message: "Too many requests", retryAfterSeconds },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
      },
    }
  );
}

type RetrievedChunk = {
  lessonId: string;
  courseId: string;
  chunkIndex: number;
  content: string;
  distance: number;
};

/**
 * POST /api/ai/tutor/chat
 * Student-only: RAG tutor dựa trên lesson embeddings trong lớp.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return errorResponse(401, "Unauthorized");
    if (user.role !== "STUDENT") return errorResponse(403, "Forbidden - Student role required");

    const ip = getClientIp(req);

    const ipLimit = await checkRateLimit({
      scope: "ai_tutor_ip",
      key: ip,
      limit: 20,
      windowMs: 10 * 60 * 1000,
    });
    if (!ipLimit.allowed) return rateLimitResponse(ipLimit.retryAfterSeconds);

    const userLimit = await checkRateLimit({
      scope: "ai_tutor_student",
      key: user.id,
      limit: 20,
      windowMs: 10 * 60 * 1000,
    });
    if (!userLimit.allowed) return rateLimitResponse(userLimit.retryAfterSeconds);

    const body = (await req.json().catch(() => null)) as unknown;
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ", {
        details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      });
    }

    const { classId, lessonId, message, topK, history } = parsed.data;

    const ok = await isStudentInClassroom(user.id, classId);
    if (!ok) return errorResponse(403, "Forbidden - Not a member of this classroom");

    const classroomCourses = await prisma.classroomCourse.findMany({
      where: { classroomId: classId },
      select: { courseId: true },
      take: 200,
    });

    const courseIds = classroomCourses.map((x) => x.courseId);
    if (courseIds.length === 0) {
      return errorResponse(404, "Lớp chưa có khóa học");
    }

    let filteredCourseIds = courseIds;
    let filteredLessonId: string | null = null;

    if (lessonId) {
      const lesson = await prisma.lesson.findFirst({
        where: { id: lessonId, courseId: { in: courseIds } },
        select: { id: true, courseId: true },
      });
      if (!lesson) return errorResponse(404, "Lesson not found");
      filteredCourseIds = [lesson.courseId];
      filteredLessonId = lesson.id;
    }

    const queryEmbedding = await embedTextWithGemini({
      text: message,
      outputDimensionality: DEFAULT_EMBEDDING_DIMENSIONALITY,
      taskType: "RETRIEVAL_QUERY",
    });
    if (queryEmbedding.length !== DEFAULT_EMBEDDING_DIMENSIONALITY) {
      return errorResponse(500, "Embedding query có dimension không hợp lệ");
    }

    const queryVec = `[${queryEmbedding.join(",")}]`;

    const chunks = await prisma.$queryRaw<RetrievedChunk[]>(
      Prisma.sql`
        SELECT
          "lessonId",
          "courseId",
          "chunkIndex",
          "content",
          ("embedding" <=> ${queryVec}::vector) as distance
        FROM "lesson_embedding_chunks"
        WHERE "courseId" IN (${Prisma.join(filteredCourseIds)})
        ${filteredLessonId ? Prisma.sql`AND "lessonId" = ${filteredLessonId}` : Prisma.empty}
        ORDER BY distance ASC
        LIMIT ${topK};
      `
    );

    if (!chunks || chunks.length === 0) {
      return NextResponse.json(
        {
          success: true,
          data: {
            answer:
              "Hiện chưa có dữ liệu bài học được index để tra cứu. Vui lòng thử lại sau hoặc liên hệ giáo viên để hệ thống index bài học.",
            sources: [],
          },
        },
        { status: 200 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return errorResponse(500, "Thiếu cấu hình GEMINI_API_KEY.");
    }

    const systemInstruction = [
      "Bạn là trợ lý học tập (Tutor) cho học sinh.",
      "Chỉ dựa trên dữ liệu 'Nguồn tham khảo' được cung cấp để trả lời.",
      "Nếu không đủ thông tin, hãy nói rõ và gợi ý học sinh xem lại bài học.",
      "Không bịa đặt.",
      "Ngôn ngữ: tiếng Việt.",
      "Trả lời ngắn gọn, rõ ràng, có thể liệt kê bước.",
      "Nếu trích dẫn, hãy ghi (Lesson <lessonId>#<chunkIndex>).",
    ].join("\n");

    const sourcesText = chunks
      .map((c) => `- (Lesson ${c.lessonId}#${c.chunkIndex}) ${c.content}`)
      .join("\n");

    const historyText = history
      .slice(-10)
      .map((h) => `${h.role === "user" ? "Học sinh" : "Trợ lý"}: ${h.content}`)
      .join("\n");

    const userPrompt = [
      filteredLessonId ? `Bối cảnh: lessonId=${filteredLessonId}` : `Bối cảnh: classId=${classId}`,
      historyText ? `Lịch sử gần đây:\n${historyText}` : "",
      `Câu hỏi của học sinh: ${message}`,
      "Nguồn tham khảo:",
      sourcesText,
    ]
      .filter((s) => s.trim().length > 0)
      .join("\n\n");

    const genAI = createGeminiClient(apiKey);
    const { result } = await generateContentWithModelFallback(genAI, {
      modelCandidates: getDefaultFastModelCandidates(),
      systemInstruction,
      request: {
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024,
        },
      },
    });

    const answer = result.response.text().trim();

    return NextResponse.json(
      {
        success: true,
        data: {
          answer,
          sources: chunks.map((c) => ({
            lessonId: c.lessonId,
            courseId: c.courseId,
            chunkIndex: c.chunkIndex,
            distance: c.distance,
            excerpt: c.content.slice(0, 240),
          })),
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("[POST /api/ai/tutor/chat] Error", error);
    if (error instanceof Error) {
      if (/GEMINI_API_KEY/i.test(error.message)) {
        return errorResponse(500, "Dịch vụ AI chưa được cấu hình.");
      }
      if (/Dịch vụ AI không hỗ trợ các model/i.test(error.message)) {
        return errorResponse(502, "Dịch vụ AI đang tạm thời không khả dụng. Vui lòng thử lại sau.");
      }
    }
    return errorResponse(500, "Internal server error");
  }
}
