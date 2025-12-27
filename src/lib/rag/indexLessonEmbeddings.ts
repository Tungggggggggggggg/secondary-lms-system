import crypto from "crypto";

import { TaskType } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";
import { chunkText } from "@/lib/rag/chunkText";
import { DEFAULT_EMBEDDING_DIMENSIONALITY, embedTextWithGemini } from "@/lib/ai/gemini-embedding";

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
  retryAttempts: number;
}): Promise<number[]> {
  const { retryAttempts, text } = params;

  for (let attempt = 0; attempt <= retryAttempts; attempt += 1) {
    try {
      return await embedTextWithGemini({
        text,
        outputDimensionality: DEFAULT_EMBEDDING_DIMENSIONALITY,
        taskType: TaskType.RETRIEVAL_DOCUMENT,
      });
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

export type IndexLessonEmbeddingsOptions = {
  maxChars?: number;
  maxEmbeddings?: number;
  concurrency?: number;
  retryAttempts?: number;
  force?: boolean;
  dryRun?: boolean;
};

export type IndexLessonEmbeddingsResult = {
  totalChunks: number;
  embeddedChunks: number;
  skippedChunks: number;
  deletedChunks: number;
};

/**
 * Index embeddings cho 1 lesson vào bảng `lesson_embedding_chunks`.
 *
 * Input:
 * - `lessonId`, `courseId`, `title`, `content`
 * - `options`:
 *   - `dryRun`: chỉ tính toán thống kê (không gọi Gemini/không ghi DB)
 *   - `maxEmbeddings`: giới hạn số chunk sẽ embed (budget theo lesson)
 *   - `concurrency`, `retryAttempts`, `force`
 *
 * Output:
 * - Thống kê (total/embedded/skipped/deleted).
 *
 * Side effects:
 * - Khi `dryRun=false`: ghi/overwrite embeddings theo (lessonId, chunkIndex) và dọn chunk thừa.
 */
export async function indexLessonEmbeddings(params: {
  lessonId: string;
  courseId: string;
  title: string;
  content: string;
  options?: IndexLessonEmbeddingsOptions;
}): Promise<IndexLessonEmbeddingsResult> {
  const { lessonId, courseId, title, content } = params;
  const options = params.options ?? {};

  const maxChars = options.maxChars ?? 1200;
  const maxEmbeddings = options.maxEmbeddings ?? 300;
  const concurrency = Math.max(1, Math.min(5, options.concurrency ?? 2));
  const retryAttempts = Math.max(0, Math.min(5, options.retryAttempts ?? 2));
  const force = options.force ?? false;
  const dryRun = options.dryRun ?? false;

  const fullText = `# ${title}\n\n${content || ""}`.trim();
  if (!fullText || fullText.length < 10) {
    return { totalChunks: 0, embeddedChunks: 0, skippedChunks: 0, deletedChunks: 0 };
  }

  const chunks = chunkText({ text: fullText, maxChars });
  if (chunks.length === 0) {
    return { totalChunks: 0, embeddedChunks: 0, skippedChunks: 0, deletedChunks: 0 };
  }

  const existingRows = (await prisma.$queryRaw`
    SELECT "chunkIndex", "contentHash"
    FROM "lesson_embedding_chunks"
    WHERE "lessonId" = ${lessonId}
    ORDER BY "chunkIndex" ASC;
  `) as Array<{ chunkIndex: number; contentHash: string }>;

  const existingByIndex = new Map<number, string>(existingRows.map((r) => [r.chunkIndex, r.contentHash]));

  let embeddedChunks = 0;
  let skippedChunks = 0;

  if (dryRun) {
    for (const ch of chunks) {
      if (embeddedChunks >= maxEmbeddings) break;

      const contentHash = sha256Hex(ch.content);
      const existingHash = existingByIndex.get(ch.index);

      if (!force && existingHash && existingHash === contentHash) {
        skippedChunks += 1;
        continue;
      }

      embeddedChunks += 1;
    }

    return {
      totalChunks: chunks.length,
      embeddedChunks,
      skippedChunks,
      deletedChunks: 0,
    };
  }

  const tasks: Array<() => Promise<void>> = [];
  let embeddingsQueued = 0;

  for (const ch of chunks) {
    if (embeddedChunks + embeddingsQueued >= maxEmbeddings) break;

    const contentHash = sha256Hex(ch.content);
    const existingHash = existingByIndex.get(ch.index);

    if (!force && existingHash && existingHash === contentHash) {
      skippedChunks += 1;
      continue;
    }

    embeddingsQueued += 1;

    tasks.push(async () => {
      const embedding = await embedTextWithRetry({
        text: ch.content,
        retryAttempts,
      });

      if (embedding.length !== DEFAULT_EMBEDDING_DIMENSIONALITY) {
        throw new Error(`Embedding dimension không hợp lệ: ${embedding.length}`);
      }

      const vec = toVectorLiteral(embedding);
      const id = `lec_${lessonId}_${ch.index}`;

      await prisma.$executeRaw`
        INSERT INTO "lesson_embedding_chunks" (
          "id", "lessonId", "courseId", "chunkIndex", "content", "contentHash", "embedding", "updatedAt"
        )
        VALUES (
          ${id}, ${lessonId}, ${courseId}, ${ch.index}, ${ch.content}, ${contentHash}, ${vec}::vector, NOW()
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
  const deletedRes = await prisma.$executeRaw`
    DELETE FROM "lesson_embedding_chunks"
    WHERE "lessonId" = ${lessonId}
      AND "chunkIndex" > ${maxIndex};
  `;

  const deletedChunks = typeof deletedRes === "number" && Number.isFinite(deletedRes) ? deletedRes : 0;

  return {
    totalChunks: chunks.length,
    embeddedChunks,
    skippedChunks,
    deletedChunks,
  };
}
