import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { errorResponse, withApiLogging } from "@/lib/api-utils";
import { auditRepo } from "@/lib/repositories/audit-repo";
import { indexLessonEmbeddings } from "@/lib/rag/indexLessonEmbeddings";

export const runtime = "nodejs";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional().default(25),
  courseId: z.string().min(1).optional(),
  lessonId: z.string().min(1).optional(),
  dryRun: z.coerce.boolean().optional().default(false),
  force: z.coerce.boolean().optional().default(false),
  maxChars: z.coerce.number().int().min(300).max(4000).optional().default(1200),
  maxEmbeddings: z.coerce.number().int().min(1).max(5000).optional().default(300),
  concurrency: z.coerce.number().int().min(1).max(5).optional().default(2),
  retryAttempts: z.coerce.number().int().min(0).max(5).optional().default(2),
  skipUnchangedLessons: z.coerce.boolean().optional().default(true),
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

const handler = withApiLogging(async (req: NextRequest) => {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return errorResponse(500, "Cron chưa được cấu hình.");
  }

  if (!isAuthorizedCron(req, cronSecret)) {
    const isDev = process.env.NODE_ENV === "development";
    if (isDev) {
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

  const { limit, courseId, lessonId, dryRun, force, maxChars, maxEmbeddings, concurrency, retryAttempts, skipUnchangedLessons } =
    parsedQuery.data;

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
    processedLessons += 1;

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
      }

      const embeddedThisLesson = result.embeddedChunks;
      const skippedThisLesson = result.skippedChunks;
      const deletedThisLesson = result.deletedChunks;

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
              chunkCount: result.totalChunks,
              embeddedChunks: embeddedThisLesson,
              skippedChunks: skippedThisLesson,
              deletedChunks: deletedThisLesson,
              stoppedReason,
            },
          });
        }
      } catch {}
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      errors.push({ lessonId: lesson.id, message: msg });
      continue;
    }

    if (stoppedReason) break;
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
}, "CRON_INDEX_LESSON_EMBEDDINGS");

export const GET = handler;
export const POST = handler;
