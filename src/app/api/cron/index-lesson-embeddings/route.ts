import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";

import { prisma } from "@/lib/prisma";
import { errorResponse, withApiLogging } from "@/lib/api-utils";
import { auditRepo } from "@/lib/repositories/audit-repo";
import { chunkText } from "@/lib/rag/chunkText";
import { DEFAULT_EMBEDDING_DIMENSIONALITY, embedTextWithGemini } from "@/lib/ai/gemini-embedding";

export const runtime = "nodejs";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional().default(25),
  courseId: z.string().min(1).optional(),
  lessonId: z.string().min(1).optional(),
  dryRun: z.coerce.boolean().optional().default(false),
  force: z.coerce.boolean().optional().default(false),
  maxChars: z.coerce.number().int().min(300).max(4000).optional().default(1200),
});

function isAuthorizedCron(req: NextRequest, expectedSecret: string): boolean {
  const header = req.headers.get("x-cron-secret");
  if (header && header === expectedSecret) return true;

  const auth = req.headers.get("authorization");
  if (!auth) return false;
  const m = /^Bearer\s+(.+)$/i.exec(auth);
  if (!m) return false;
  return m[1] === expectedSecret;
}

function sha256Hex(text: string): string {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

function toVectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}

const handler = withApiLogging(async (req: NextRequest) => {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return errorResponse(500, "Cron chưa được cấu hình.");
  }

  if (!isAuthorizedCron(req, cronSecret)) {
    const isDev = process.env.NODE_ENV === "development";
    if (isDev) {
      const header = req.headers.get("x-cron-secret");
      const auth = req.headers.get("authorization");
      console.warn("[CRON_INDEX_LESSON_EMBEDDINGS] Unauthorized", {
        hasXChronSecretHeader: Boolean(header),
        xCronSecretLength: header?.length ?? 0,
        hasAuthorizationHeader: Boolean(auth),
      });
      return errorResponse(401, "Unauthorized", {
        details:
          "Thiếu hoặc sai CRON_SECRET. PowerShell không tự đọc .env → hãy set `$env:CRON_SECRET='...'` hoặc truyền trực tiếp header `x-cron-secret: <CRON_SECRET>`.",
      });
    }
    return errorResponse(401, "Unauthorized");
  }

  const parsedQuery = querySchema.safeParse({
    limit: req.nextUrl.searchParams.get("limit") ?? undefined,
    courseId: req.nextUrl.searchParams.get("courseId") ?? undefined,
    lessonId: req.nextUrl.searchParams.get("lessonId") ?? undefined,
    dryRun: req.nextUrl.searchParams.get("dryRun") ?? undefined,
    force: req.nextUrl.searchParams.get("force") ?? undefined,
    maxChars: req.nextUrl.searchParams.get("maxChars") ?? undefined,
  });

  if (!parsedQuery.success) {
    return errorResponse(400, "Dữ liệu không hợp lệ", {
      details: parsedQuery.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    });
  }

  const { limit, courseId, lessonId, dryRun, force, maxChars } = parsedQuery.data;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey && !dryRun) {
    return errorResponse(500, "Thiếu cấu hình GEMINI_API_KEY.");
  }

  const lessons = lessonId
    ? await prisma.lesson.findMany({
        where: { id: lessonId },
        select: { id: true, title: true, content: true, courseId: true, updatedAt: true },
        take: 1,
      })
    : await prisma.lesson.findMany({
        where: courseId ? { courseId } : undefined,
        select: { id: true, title: true, content: true, courseId: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: limit,
      });

  let processedLessons = 0;
  let totalChunks = 0;
  let embeddedChunks = 0;
  let skippedChunks = 0;
  let deletedChunks = 0;

  const errors: Array<{ lessonId: string; message: string }> = [];

  for (const lesson of lessons) {
    processedLessons += 1;

    let embeddedThisLesson = 0;
    let skippedThisLesson = 0;
    let deletedThisLesson = 0;

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
      for (const ch of chunks) {
        const contentHash = sha256Hex(ch.content);
        const existingHash = existingByIndex.get(ch.index);

        if (!force && existingHash && existingHash === contentHash) {
          skippedChunks += 1;
          skippedThisLesson += 1;
          continue;
        }

        if (dryRun) {
          embeddedChunks += 1;
          embeddedThisLesson += 1;
          continue;
        }

        const embedding = await embedTextWithGemini({
          text: ch.content,
          outputDimensionality: DEFAULT_EMBEDDING_DIMENSIONALITY,
          taskType: "RETRIEVAL_DOCUMENT",
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
        embeddedThisLesson += 1;
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
          deletedThisLesson += res;
        }
      }

      try {
        const course = await prisma.course.findUnique({
          where: { id: lesson.courseId },
          select: { authorId: true, organizationId: true },
        });

        if (course?.authorId) {
          await auditRepo.write({
            actorId: course.authorId,
            actorRole: "TEACHER",
            action: "CRON_INDEX_LESSON_EMBEDDINGS",
            entityType: "LESSON",
            entityId: lesson.id,
            organizationId: course.organizationId ?? null,
            metadata: {
              dryRun,
              force,
              courseId: lesson.courseId,
              chunkCount: chunks.length,
              embeddedChunks: embeddedThisLesson,
              skippedChunks: skippedThisLesson,
              deletedChunks: deletedThisLesson,
            },
          });
        }
      } catch {}
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
        limit,
        courseId: courseId ?? null,
        lessonId: lessonId ?? null,
        processedLessons,
        totalChunks,
        embeddedChunks,
        skippedChunks,
        deletedChunks,
        errors,
      },
    },
    { status: 200 }
  );
}, "CRON_INDEX_LESSON_EMBEDDINGS");

export const GET = handler;
export const POST = handler;
