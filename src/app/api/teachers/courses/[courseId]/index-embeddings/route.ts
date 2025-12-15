import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";

import { TaskType } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";
import { errorResponse, getAuthenticatedUser } from "@/lib/api-utils";
import { chunkText } from "@/lib/rag/chunkText";
import { DEFAULT_EMBEDDING_DIMENSIONALITY, embedTextWithGemini } from "@/lib/ai/gemini-embedding";

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

function sha256Hex(text: string): string {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

function toVectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableEmbeddingError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /429|rate|too many|resource_exhausted|timeout|temporarily|503|502/i.test(msg);
}

async function embedTextWithRetry(params: {
  text: string;
  outputDimensionality: 768 | 1536 | 3072;
  taskType: TaskType;
  retryAttempts: number;
}): Promise<number[]> {
  const { retryAttempts, ...embedParams } = params;

  for (let attempt = 0; attempt <= retryAttempts; attempt += 1) {
    try {
      return await embedTextWithGemini(embedParams);
    } catch (e: unknown) {
      if (attempt >= retryAttempts || !isRetryableEmbeddingError(e)) {
        throw e;
      }
      const backoffMs = Math.min(10_000, 600 * Math.pow(2, attempt));
      await sleep(backoffMs);
    }
  }
  throw new Error("Embedding retry exceeded");
}

async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number
): Promise<T[]> {
  const results: T[] = [];
  let idx = 0;

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, async () => {
    while (idx < tasks.length) {
      const current = idx;
      idx += 1;
      results[current] = await tasks[current]();
    }
  });

  await Promise.all(workers);
  return results;
}

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

    for (const lesson of lessons) {
      if (stoppedReason) break;

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
      const fullText = `# ${lesson.title}\n\n${lesson.content || ""}`.trim();
      const chunks = chunkText({ text: fullText, maxChars });
      totalChunks += chunks.length;

      const existingRows = await prisma.$queryRaw<Array<{ chunkIndex: number; contentHash: string }>>`
        SELECT "chunkIndex", "contentHash"
        FROM "lesson_embedding_chunks"
        WHERE "lessonId" = ${lesson.id}
        ORDER BY "chunkIndex" ASC;
      `;

      const existingByIndex = new Map<number, string>(existingRows.map((r) => [r.chunkIndex, r.contentHash]));

      try {
        const tasks: Array<() => Promise<void>> = [];
        let embeddingsQueued = 0;

        for (const ch of chunks) {
          if (!dryRun && embeddedChunks + embeddingsQueued >= maxEmbeddings) {
            stoppedReason = "MAX_EMBEDDINGS";
            break;
          }

          if (dryRun && embeddedChunks >= maxEmbeddings) {
            stoppedReason = "MAX_EMBEDDINGS";
            break;
          }

          const contentHash = sha256Hex(ch.content);
          const existingHash = existingByIndex.get(ch.index);

          if (!force && existingHash && existingHash === contentHash) {
            skippedChunks += 1;
            continue;
          }

          if (dryRun) {
            embeddedChunks += 1;
            continue;
          }

          embeddingsQueued += 1;
          tasks.push(async () => {
            const embedding = await embedTextWithRetry({
              text: ch.content,
              outputDimensionality: DEFAULT_EMBEDDING_DIMENSIONALITY,
              taskType: TaskType.RETRIEVAL_DOCUMENT,
              retryAttempts,
            });
            if (embedding.length !== DEFAULT_EMBEDDING_DIMENSIONALITY) {
              throw new Error(`Embedding dimension không hợp lệ: ${embedding.length}`);
            }

            const vec = toVectorLiteral(embedding);
            const id = `lec_${lesson.id}_${ch.index}`;

            await prisma.$executeRaw`
              INSERT INTO "lesson_embedding_chunks" (
                "id", "lessonId", "courseId", "chunkIndex", "content", "contentHash", "embedding", "updatedAt"
              )
              VALUES (
                ${id}, ${lesson.id}, ${lesson.courseId}, ${ch.index}, ${ch.content}, ${contentHash}, ${vec}::vector, NOW()
              )
              ON CONFLICT ("lessonId", "chunkIndex")
              DO UPDATE SET
                "content" = EXCLUDED."content",
                "contentHash" = EXCLUDED."contentHash",
                "embedding" = EXCLUDED."embedding",
                "updatedAt" = NOW();
            `;

            embeddedChunks += 1;
          });
        }

        if (tasks.length > 0) {
          await runWithConcurrency(tasks, concurrency);
        }

        const maxIndex = chunks.length > 0 ? Math.max(...chunks.map((c) => c.index)) : -1;
        if (!dryRun) {
          const res = await prisma.$executeRaw`
            DELETE FROM "lesson_embedding_chunks"
            WHERE "lessonId" = ${lesson.id}
              AND "chunkIndex" > ${maxIndex};
          `;
          if (typeof res === "number" && Number.isFinite(res)) {
            deletedChunks += res;
          }
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
