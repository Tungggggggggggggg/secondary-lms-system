import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, getAuthenticatedUser, isStudentInClassroom } from "@/lib/api-utils";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

const LESSON_FILES_BUCKET =
  process.env.SUPABASE_ASSIGNMENTS_BUCKET ||
  process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ||
  "lms-submissions";

/**
 * GET /api/students/classes/[classId]/lessons/[lessonId]
 * Student-only: lấy chi tiết bài học (Lesson) nếu học sinh thuộc lớp và lesson thuộc course của lớp.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { classId: string; lessonId: string } }
) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return errorResponse(401, "Unauthorized");
    if (user.role !== "STUDENT") {
      return errorResponse(403, "Forbidden - Student role required");
    }

    const classId = params.classId;
    const lessonId = params.lessonId;

    if (!classId || !lessonId) {
      return errorResponse(400, "Thiếu tham số");
    }

    const ok = await isStudentInClassroom(user.id, classId);
    if (!ok) return errorResponse(403, "Forbidden - Not a member of this classroom");

    const classroomCourses = (await prisma.classroomCourse.findMany({
      where: { classroomId: classId },
      select: { courseId: true },
      take: 200,
    })) as Array<{ courseId: string }>;

    const courseIds = classroomCourses.map((x) => x.courseId);
    if (courseIds.length === 0) {
      return errorResponse(404, "Lớp chưa có khóa học");
    }

    const lesson = await prisma.lesson.findFirst({
      where: { id: lessonId, courseId: { in: courseIds } },
      select: {
        id: true,
        title: true,
        content: true,
        order: true,
        createdAt: true,
        courseId: true,
        course: {
          select: {
            author: { select: { fullname: true, email: true } },
          },
        },
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

    if (!lesson) return errorResponse(404, "Lesson not found");

    const [prev, next] = await Promise.all([
      prisma.lesson.findFirst({
        where: { courseId: lesson.courseId, order: { lt: lesson.order } },
        orderBy: { order: "desc" },
        select: { id: true },
      }),
      prisma.lesson.findFirst({
        where: { courseId: lesson.courseId, order: { gt: lesson.order } },
        orderBy: { order: "asc" },
        select: { id: true },
      }),
    ]);

    type LessonAttachmentRow = {
      id: string;
      name: string;
      storagePath: string;
      mimeType: string;
    };

    const admin = supabaseAdmin;
    const attachmentsRaw = (lesson.attachments ?? []) as LessonAttachmentRow[];
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
            console.error("[LessonDetail] createSignedUrl error", {
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
          title: lesson.title,
          content: lesson.content,
          teacher: lesson.course?.author
            ? { fullname: lesson.course.author.fullname, email: lesson.course.author.email }
            : null,
          publishedAt: lesson.createdAt.toISOString(),
          prevLessonId: prev?.id ?? null,
          nextLessonId: next?.id ?? null,
          attachments,
          links: [],
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("[GET /api/students/classes/[classId]/lessons/[lessonId]] Error", error);
    return errorResponse(500, "Internal server error");
  }
}
