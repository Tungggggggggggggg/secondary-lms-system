import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { errorResponse, getAuthenticatedUser } from "@/lib/api-utils";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

const LESSON_FILES_BUCKET =
  process.env.SUPABASE_ASSIGNMENTS_BUCKET ||
  process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ||
  "lms-submissions";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(200_000).optional(),
  order: z.number().int().min(1).max(10_000).optional(),
});

async function assertTeacherOwnsLesson(teacherId: string, courseId: string, lessonId: string) {
  const lesson = await prisma.lesson.findFirst({
    where: {
      id: lessonId,
      courseId,
      course: { authorId: teacherId },
    },
    select: {
      id: true,
      courseId: true,
      title: true,
      content: true,
      order: true,
      createdAt: true,
      updatedAt: true,
      attachments: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          storagePath: true,
          mimeType: true,
        },
      },
    },
  });
  return lesson;
}

export async function GET(req: NextRequest, ctx: { params: { courseId: string; lessonId: string } }) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return errorResponse(401, "Unauthorized");
    if (user.role !== "TEACHER") return errorResponse(403, "Forbidden");

    const courseId = ctx?.params?.courseId;
    const lessonId = ctx?.params?.lessonId;
    if (!courseId || !lessonId) return errorResponse(400, "Missing params");

    const lesson = await assertTeacherOwnsLesson(user.id, courseId, lessonId);
    if (!lesson) return errorResponse(404, "Lesson not found");

    type LessonAttachmentRow = {
      id: string;
      name: string;
      storagePath: string;
      mimeType: string;
    };

    const admin = supabaseAdmin;
    const attachmentsRaw = ((lesson as any).attachments ?? []) as LessonAttachmentRow[];
    const attachments = await Promise.all(
      attachmentsRaw.map(async (a) => {
        let url: string | null = null;
        if (admin) {
          try {
            const { data, error } = await admin.storage
              .from(LESSON_FILES_BUCKET)
              .createSignedUrl(a.storagePath, 900);
            if (!error) {
              url = data?.signedUrl || null;
            }
          } catch (e) {
            console.error("[TeacherLessonDetail] createSignedUrl error", {
              lessonId,
              attachmentId: a.id,
              path: a.storagePath,
              error: String(e),
            });
          }
        }
        return {
          id: a.id,
          name: a.name,
          storagePath: a.storagePath,
          mimeType: a.mimeType,
          url,
        };
      })
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          id: lesson.id,
          courseId: lesson.courseId,
          title: lesson.title,
          content: lesson.content,
          order: lesson.order,
          createdAt: lesson.createdAt,
          updatedAt: lesson.updatedAt,
          attachments,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[GET /api/teachers/courses/[courseId]/lessons/[lessonId]] Error", error);
    return errorResponse(500, "Internal server error");
  }
}

export async function PATCH(req: NextRequest, ctx: { params: { courseId: string; lessonId: string } }) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return errorResponse(401, "Unauthorized");
    if (user.role !== "TEACHER") return errorResponse(403, "Forbidden");

    const courseId = ctx?.params?.courseId;
    const lessonId = ctx?.params?.lessonId;
    if (!courseId || !lessonId) return errorResponse(400, "Missing params");

    const existing = await assertTeacherOwnsLesson(user.id, courseId, lessonId);
    if (!existing) return errorResponse(404, "Lesson not found");

    const body = await req.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ", {
        details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      });
    }

    const updated = await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        ...(parsed.data.title !== undefined ? { title: parsed.data.title.trim() } : {}),
        ...(parsed.data.content !== undefined ? { content: parsed.data.content } : {}),
        ...(parsed.data.order !== undefined ? { order: parsed.data.order } : {}),
      },
      select: { id: true, courseId: true, title: true, content: true, order: true, createdAt: true, updatedAt: true },
    });

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error) {
    console.error("[PATCH /api/teachers/courses/[courseId]/lessons/[lessonId]] Error", error);
    return errorResponse(500, "Internal server error");
  }
}

export async function DELETE(req: NextRequest, ctx: { params: { courseId: string; lessonId: string } }) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return errorResponse(401, "Unauthorized");
    if (user.role !== "TEACHER") return errorResponse(403, "Forbidden");

    const courseId = ctx?.params?.courseId;
    const lessonId = ctx?.params?.lessonId;
    if (!courseId || !lessonId) return errorResponse(400, "Missing params");

    const existing = await assertTeacherOwnsLesson(user.id, courseId, lessonId);
    if (!existing) return errorResponse(404, "Lesson not found");

    await prisma.lesson.delete({ where: { id: lessonId } });

    return NextResponse.json({ success: true, data: { deleted: true } }, { status: 200 });
  } catch (error) {
    console.error("[DELETE /api/teachers/courses/[courseId]/lessons/[lessonId]] Error", error);
    return errorResponse(500, "Internal server error");
  }
}
