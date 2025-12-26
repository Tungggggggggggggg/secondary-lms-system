import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";

import { prisma } from "@/lib/prisma";
import { errorResponse, getAuthenticatedUser } from "@/lib/api-utils";
import { extractTextFromFile } from "@/lib/files/extractTextFromFile";
import { supabaseAdmin } from "@/lib/supabase";
import { indexLessonEmbeddings } from "@/lib/rag/indexLessonEmbeddings";

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

async function indexLessonEmbeddingsForLesson(params: {
  lessonId: string;
  courseId: string;
  title: string;
  content: string;
  maxChars?: number;
}) {
  const { lessonId, courseId, title, content, maxChars = 1200 } = params;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return;
  }

  await indexLessonEmbeddings({
    lessonId,
    courseId,
    title,
    content,
    options: {
      maxChars,
      concurrency: 2,
      retryAttempts: 2,
      maxEmbeddings: 300,
      force: false,
    },
  });
}

const formSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  order: z.number().int().min(1).max(10_000).optional(),
});

export async function POST(req: NextRequest, ctx: { params: { courseId: string } }) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return errorResponse(401, "Unauthorized");
    if (user.role !== "TEACHER") return errorResponse(403, "Forbidden");

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

    const extracted = await extractTextFromFile(file);

    let order = parsed.data.order;
    if (!order) {
      const last = await prisma.lesson.findFirst({
        where: { courseId },
        orderBy: { order: "desc" },
        select: { order: true },
      });
      order = (last?.order ?? 0) + 1;
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

    // Upload original file as attachment for students to download (non-fatal on failure)
    try {
      const admin = supabaseAdmin;
      if (admin) {
        const originalName = file.name?.trim() ? file.name : created.title;
        const safeName = slugifyFileName(originalName);
        const key = `lesson/${created.id}/${crypto.randomUUID()}-${safeName}`;

        const arrayBuffer = await file.arrayBuffer();
        const { data, error } = await admin.storage
          .from(LESSON_FILES_BUCKET)
          .upload(key, Buffer.from(arrayBuffer), {
            contentType: (file as File).type || "application/octet-stream",
            upsert: false,
          });

        if (!error && data?.path) {
          await prisma.lessonAttachment.create({
            data: {
              lessonId: created.id,
              name: originalName,
              storagePath: data.path,
              mimeType: (file as File).type || "application/octet-stream",
              sizeBytes: (file as File).size,
            },
          });
        }
      }
    } catch {}

    // Tự động index embeddings cho bài học vừa tạo (không dry run, luôn embed)
    try {
      void indexLessonEmbeddingsForLesson({
        lessonId: created.id,
        courseId,
        title: created.title,
        content: extracted.text,
      }).catch(() => {});
    } catch {}

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
