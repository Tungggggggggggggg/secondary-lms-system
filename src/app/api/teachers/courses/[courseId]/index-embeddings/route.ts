import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";

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
});

function sha256Hex(text: string): string {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

function toVectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}

export async function POST(req: NextRequest, ctx: { params: { courseId: string } }) {
  try {
    const user = await getAuthenticatedUser(req, "TEACHER");
    if (!user) return errorResponse(401, "Unauthorized");

    const courseId = ctx?.params?.courseId;
    if (!courseId) return errorResponse(400, "Missing courseId");

    const owned = await prisma.course.findFirst({ where: { id: courseId, authorId: user.id }, select: { id: true } });
    if (!owned) return errorResponse(404, "Course not found");

    const parsedQuery = querySchema.safeParse({
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

    const { lessonId, dryRun, force, maxChars } = parsedQuery.data;

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
    let totalChunks = 0;
    let embeddedChunks = 0;
    let skippedChunks = 0;
    let deletedChunks = 0;
    const errors: Array<{ lessonId: string; message: string }> = [];

    for (const lesson of lessons) {
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
        for (const ch of chunks) {
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
          totalChunks,
          embeddedChunks,
          skippedChunks,
          deletedChunks,
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
