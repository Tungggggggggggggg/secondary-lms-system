import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { errorResponse, getAuthenticatedUser } from "@/lib/api-utils";
import { indexLessonEmbeddings } from "@/lib/rag/indexLessonEmbeddings";

export const runtime = "nodejs";

const querySchema = z.object({
  lessonId: z.string().min(1).optional(),
  dryRun: z.coerce.boolean().optional().default(false),
  force: z.coerce.boolean().optional().default(false),
  maxChars: z.coerce.number().int().min(300).max(4000).optional().default(1200),
  maxEmbeddings: z.coerce.number().int().min(1).max(2000).optional().default(200),
  concurrency: z.coerce.number().int().min(1).max(5).optional().default(2),
  retryAttempts: z.coerce.number().int().min(0).max(5).optional().default(2),
  skipUnchangedLessons: z.coerce.boolean().optional().default(true),
});

/**
 * POST /api/teachers/courses/[courseId]/index-embeddings
 *
 * Input (query):
 * - lessonId?: string
 * - dryRun?: boolean
 * - force?: boolean
 * - maxChars?: number
 * - maxEmbeddings?: number
 * - concurrency?: number
 * - retryAttempts?: number
 * - skipUnchangedLessons?: boolean
 *
 * Output:
 * - success true + thống kê indexing
 *
 * Side effects:
 * - Ghi DB lesson_embedding_chunks (trừ dryRun)
 * - Gọi Gemini API để tạo embeddings
 */
export async function POST(req: NextRequest, ctx: { params: { courseId: string } }) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return errorResponse(401, "Unauthorized");
    if (user.role !== "TEACHER") return errorResponse(403, "Forbidden");

    const courseId = ctx?.params?.courseId;
    if (!courseId) return errorResponse(400, "Missing courseId");

    const owned = await prisma.course.findFirst({ where: { id: courseId, authorId: user.id }, select: { id: true } });
    if (!owned) return errorResponse(404, "Course not found");

    const parsedQuery = querySchema.safeParse({
      lessonId: req.nextUrl.searchParams.get("lessonId") ?? undefined,
      dryRun: req.nextUrl.searchParams.get("dryRun") ?? undefined,
      force: req.nextUrl.searchParams.get("force") ?? undefined,
      maxChars: req.nextUrl.searchParams.get("maxChars") ?? undefined,
      maxEmbeddings: req.nextUrl.searchParams.get("maxEmbeddings") ?? undefined,
      concurrency: req.nextUrl.searchParams.get("concurrency") ?? undefined,
      retryAttempts: req.nextUrl.searchParams.get("retryAttempts") ?? undefined,
      skipUnchangedLessons: req.nextUrl.searchParams.get("skipUnchangedLessons") ?? undefined,
    });
    if (!parsedQuery.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ", {
        details: parsedQuery.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      });
    }

    const { lessonId, dryRun, force, maxChars } = parsedQuery.data;

    const { maxEmbeddings, concurrency, retryAttempts, skipUnchangedLessons } = parsedQuery.data;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey && !dryRun) {
      return errorResponse(500, "Thiếu cấu hình GEMINI_API_KEY.");
    }

    const lessons = lessonId
      ? await prisma.lesson.findMany({
          where: { id: lessonId, courseId },
          select: { id: true, title: true, content: true, courseId: true, updatedAt: true },
          take: 1,
        })
      : await prisma.lesson.findMany({
          where: { courseId },
          select: { id: true, title: true, content: true, courseId: true, updatedAt: true },
          orderBy: { updatedAt: "desc" },
          take: 100,
        });

    let processedLessons = 0;
    let skippedLessons = 0;
    let skippedLessonsUnchanged = 0;
    let totalChunks = 0;
    let embeddedChunks = 0;
    let skippedChunks = 0;
    let deletedChunks = 0;
    let stoppedReason: "MAX_EMBEDDINGS" | null = null;
    const errors: Array<{ lessonId: string; message: string }> = [];

    let remainingEmbeddings = maxEmbeddings;

    for (const lesson of lessons) {
      if (stoppedReason) break;

      if (remainingEmbeddings <= 0) {
        stoppedReason = "MAX_EMBEDDINGS";
        break;
      }

      if (!dryRun && !force && skipUnchangedLessons) {
        const agg = await prisma.lessonEmbeddingChunk.aggregate({
          where: { lessonId: lesson.id },
          _max: { updatedAt: true },
          _count: { _all: true },
        });

        const indexedCount = agg._count._all;
        const lastIndexedAt = agg._max.updatedAt;
        if (indexedCount > 0 && lastIndexedAt && lastIndexedAt >= lesson.updatedAt) {
          skippedLessons += 1;
          skippedLessonsUnchanged += 1;
          continue;
        }
      }

      processedLessons += 1;
      try {
        const result = await indexLessonEmbeddings({
          lessonId: lesson.id,
          courseId: lesson.courseId,
          title: lesson.title,
          content: lesson.content ?? "",
          options: {
            dryRun,
            force,
            maxChars,
            maxEmbeddings: remainingEmbeddings,
            concurrency,
            retryAttempts,
          },
        });

        totalChunks += result.totalChunks;
        embeddedChunks += result.embeddedChunks;
        skippedChunks += result.skippedChunks;
        deletedChunks += result.deletedChunks;

        remainingEmbeddings -= result.embeddedChunks;
        if (remainingEmbeddings <= 0) {
          stoppedReason = "MAX_EMBEDDINGS";
          break;
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        errors.push({ lessonId: lesson.id, message: msg });
        continue;
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          dryRun,
          force,
          courseId,
          lessonId: lessonId ?? null,
          processedLessons,
          skippedLessons,
          skippedLessonsUnchanged,
          totalChunks,
          embeddedChunks,
          skippedChunks,
          deletedChunks,
          stoppedReason,
          errors,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[POST /api/teachers/courses/[courseId]/index-embeddings] Error", error);
    if (error instanceof Error) {
      if (/GEMINI_API_KEY/i.test(error.message)) {
        return errorResponse(500, "Dịch vụ AI chưa được cấu hình.");
      }
      if (/không hỗ trợ các model/i.test(error.message)) {
        return errorResponse(502, "Dịch vụ AI đang tạm thời không khả dụng. Vui lòng thử lại sau.");
      }
    }
    return errorResponse(500, "Internal server error");
  }
}
