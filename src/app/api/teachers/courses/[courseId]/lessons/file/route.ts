import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";

import { prisma } from "@/lib/prisma";
import { errorResponse, getAuthenticatedUser } from "@/lib/api-utils";
import { extractTextFromFile } from "@/lib/files/extractTextFromFile";
import { supabaseAdmin } from "@/lib/supabase";
import { chunkText } from "@/lib/rag/chunkText";
import { DEFAULT_EMBEDDING_DIMENSIONALITY, embedTextWithGemini } from "@/lib/ai/gemini-embedding";

export const runtime = "nodejs";

const LESSON_FILES_BUCKET =
  process.env.SUPABASE_ASSIGNMENTS_BUCKET ||
  process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ||
  "lms-submissions";

function slugifyFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$|\s+/g, "");
}

function sha256Hex(text: string): string {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

async function indexLessonEmbeddingsForLesson(params: {
  lessonId: string;
  courseId: string;
  title: string;
  content: string;
  maxChars?: number;
}) {
  const { lessonId, courseId, title, content, maxChars = 1200 } = params;

  const fullText = `# ${title}\n\n${content || ""}`.trim();
  if (!fullText || fullText.length < 10) {
    console.log("[LessonEmbedding] Skip indexing: content too short", { lessonId, courseId });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[LessonEmbedding] Missing GEMINI_API_KEY, skip indexing", { lessonId, courseId });
    return;
  }

  const chunks = chunkText({ text: fullText, maxChars });
  if (!chunks || chunks.length === 0) {
    console.log("[LessonEmbedding] No chunks generated, skip indexing", { lessonId, courseId });
    return;
  }

  let embeddedChunks = 0;

  for (const ch of chunks) {
    const contentHash = sha256Hex(ch.content);

    const embedding = await embedTextWithGemini({
      text: ch.content,
      outputDimensionality: DEFAULT_EMBEDDING_DIMENSIONALITY,
      taskType: "RETRIEVAL_DOCUMENT",
    });
    if (embedding.length !== DEFAULT_EMBEDDING_DIMENSIONALITY) {
      throw new Error(`Embedding dimension không hợp lệ: ${embedding.length}`);
    }

    const vecLiteral = `[${embedding.join(",")}]`;
    const id = `lec_${lessonId}_${ch.index}`;

    await prisma.$executeRaw`
      INSERT INTO "lesson_embedding_chunks" (
        "id", "lessonId", "courseId", "chunkIndex", "content", "contentHash", "embedding", "updatedAt"
      )
      VALUES (
        ${id}, ${lessonId}, ${courseId}, ${ch.index}, ${ch.content}, ${contentHash}, ${vecLiteral}::vector, NOW()
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

  console.log("[LessonEmbedding] Indexed lesson", {
    lessonId,
    courseId,
    embeddedChunks,
  });
}

const formSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  order: z.number().int().min(1).max(10_000).optional(),
});

export async function POST(req: NextRequest, ctx: { params: { courseId: string } }) {
  try {
    const user = await getAuthenticatedUser(req, "TEACHER");
    if (!user) return errorResponse(401, "Unauthorized");

    const courseId = ctx?.params?.courseId;
    if (!courseId) return errorResponse(400, "Missing courseId");

    const course = await prisma.course.findFirst({ where: { id: courseId, authorId: user.id }, select: { id: true } });
    if (!course) return errorResponse(404, "Course not found");

    const form = await req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return errorResponse(400, "Dữ liệu không hợp lệ", { details: "file is required" });
    }

    const titleRaw = form.get("title");
    const orderRaw = form.get("order");

    const parsed = formSchema.safeParse({
      title: titleRaw === null || titleRaw === undefined || titleRaw === "" ? undefined : String(titleRaw),
      order:
        orderRaw === null || orderRaw === undefined || orderRaw === ""
          ? undefined
          : Number(orderRaw),
    });

    if (!parsed.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ", {
        details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      });
    }

    console.log("[LessonFile] Received file upload", {
      courseId,
      teacherId: user.id,
      fileName: file.name,
      mimeType: (file as File).type,
      sizeBytes: (file as File).size,
    });

    const extracted = await extractTextFromFile(file);

    let order = parsed.data.order;
    if (!order) {
      const max = await prisma.lesson.aggregate({ where: { courseId }, _max: { order: true } });
      order = (max._max.order ?? 0) + 1;
    }

    const defaultTitle = file.name ? file.name.replace(/\.[^.]+$/, "").trim() : "Bài học";

    const created = await prisma.lesson.create({
      data: {
        courseId,
        title: (parsed.data.title?.trim() || defaultTitle || "Bài học").slice(0, 200),
        content: extracted.text,
        order,
      },
      select: { id: true, title: true, order: true, createdAt: true, updatedAt: true },
    });

    console.log("[LessonFile] Created lesson from file", {
      lessonId: created.id,
      title: created.title,
      order: created.order,
    });

    // Upload original file as attachment for students to download (non-fatal on failure)
    try {
      const admin = supabaseAdmin;
      if (!admin) {
        console.error("[LessonAttachment] supabaseAdmin not initialized");
      } else {
        const originalName = typeof (file as any).name === "string" ? (file as any).name : created.title;
        const safeName = slugifyFileName(originalName);
        const key = `lesson/${created.id}/${crypto.randomUUID()}-${safeName}`;

        console.log("[LessonAttachment] Start upload to Supabase", {
          lessonId: created.id,
          bucket: LESSON_FILES_BUCKET,
          key,
          mimeType: (file as File).type,
          sizeBytes: (file as File).size,
        });

        const arrayBuffer = await file.arrayBuffer();
        const { data, error } = await admin.storage
          .from(LESSON_FILES_BUCKET)
          .upload(key, Buffer.from(arrayBuffer), {
            contentType: (file as File).type || "application/octet-stream",
            upsert: false,
          });

        if (error) {
          console.error("[LessonAttachment] Upload failed", error);
        } else if (data?.path) {
          const attachment = await (prisma as any).lessonAttachment.create({
            data: {
              lessonId: created.id,
              name: originalName,
              storagePath: data.path,
              mimeType: (file as File).type || "application/octet-stream",
              sizeBytes: (file as File).size,
            },
          });
          console.log("[LessonAttachment] Created attachment record", {
            id: attachment.id,
            lessonId: attachment.lessonId,
            storagePath: attachment.storagePath,
          });
        }
      }
    } catch (err) {
      console.error("[LessonAttachment] Error while uploading/creating attachment", err);
    }

    // Tự động index embeddings cho bài học vừa tạo (không dry run, luôn embed)
    try {
      console.log("[LessonEmbedding] Start indexing for created lesson", {
        lessonId: created.id,
        courseId,
      });

      await indexLessonEmbeddingsForLesson({
        lessonId: created.id,
        courseId,
        title: created.title,
        content: extracted.text,
      });
    } catch (err) {
      console.error("[LessonEmbedding] Failed to index lesson", {
        lessonId: created.id,
        courseId,
        error: err,
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          lesson: created,
          extracted: {
            mime: extracted.mime,
            charCount: extracted.text.length,
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/teachers/courses/[courseId]/lessons/file] Error", error);

    if (error instanceof Error) {
      if (/Định dạng file không được hỗ trợ/i.test(error.message)) {
        return errorResponse(415, error.message);
      }
      if (/File quá lớn/i.test(error.message)) {
        return errorResponse(413, error.message);
      }
      if (/Không trích xuất được nội dung/i.test(error.message)) {
        return errorResponse(400, error.message);
      }
    }

    return errorResponse(500, "Internal server error");
  }
}
