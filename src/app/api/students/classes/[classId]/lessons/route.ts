import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { errorResponse, getAuthenticatedUser, isStudentInClassroom } from "@/lib/api-utils";

export const runtime = "nodejs";

const querySchema = z.object({
  courseId: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
});

/**
 * GET /api/students/classes/[classId]/lessons
 * Student-only: lấy danh sách bài học (Lesson) thuộc các course của lớp.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { classId: string } }
) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return errorResponse(401, "Unauthorized");
    if (user.role !== "STUDENT") {
      return errorResponse(403, "Forbidden - Student role required");
    }

    const classId = params.classId;
    if (!classId) return errorResponse(400, "Thiếu tham số");

    const parsedQuery = querySchema.safeParse({
      courseId: req.nextUrl.searchParams.get("courseId") ?? undefined,
      limit: req.nextUrl.searchParams.get("limit") ?? undefined,
    });

    if (!parsedQuery.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ", {
        details: parsedQuery.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      });
    }

    const { courseId, limit } = parsedQuery.data;

    const ok = await isStudentInClassroom(user.id, classId);
    if (!ok) return errorResponse(403, "Forbidden - Not a member of this classroom");

    const classroomCourses = await prisma.classroomCourse.findMany({
      where: {
        classroomId: classId,
        ...(courseId ? { courseId } : {}),
      },
      select: { courseId: true, course: { select: { title: true } } },
      take: 200,
    });

    const courseIds = classroomCourses.map((x) => x.courseId);
    if (courseIds.length === 0) {
      return NextResponse.json(
        {
          success: true,
          data: { items: [] as Array<unknown> },
        },
        { status: 200 }
      );
    }

    const courseTitleById = new Map<string, string>(
      classroomCourses.map((c) => [c.courseId, c.course?.title ?? "Khóa học"])
    );

    const lessons = await prisma.lesson.findMany({
      where: { courseId: { in: courseIds } },
      orderBy: [{ courseId: "asc" }, { order: "asc" }],
      take: limit,
      select: {
        id: true,
        title: true,
        order: true,
        createdAt: true,
        courseId: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          items: lessons.map((l) => ({
            id: l.id,
            title: l.title,
            order: l.order,
            courseId: l.courseId,
            courseTitle: courseTitleById.get(l.courseId) ?? "Khóa học",
            publishedAt: l.createdAt.toISOString(),
          })),
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("[GET /api/students/classes/[classId]/lessons] Error", error);
    return errorResponse(500, "Internal server error");
  }
}
