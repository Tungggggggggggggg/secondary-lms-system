import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { errorResponse, getAuthenticatedUser } from "@/lib/api-utils";

export const runtime = "nodejs";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  coverImage: z.string().max(2000).optional().nullable(),
});

async function assertTeacherOwnsCourse(teacherId: string, courseId: string) {
  const course = await prisma.course.findFirst({
    where: { id: courseId, authorId: teacherId },
    select: {
      id: true,
      title: true,
      description: true,
      coverImage: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { lessons: true, classrooms: true } },
    },
  });
  return course;
}

export async function GET(req: NextRequest, ctx: { params: { courseId: string } }) {
  try {
    const user = await getAuthenticatedUser(req, "TEACHER");
    if (!user) return errorResponse(401, "Unauthorized");

    const courseId = ctx?.params?.courseId;
    if (!courseId) return errorResponse(400, "Missing courseId");

    const course = await assertTeacherOwnsCourse(user.id, courseId);
    if (!course) return errorResponse(404, "Course not found");

    return NextResponse.json({ success: true, data: course }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/teachers/courses/[courseId]] Error", error);
    return errorResponse(500, "Internal server error");
  }
}

export async function PATCH(req: NextRequest, ctx: { params: { courseId: string } }) {
  try {
    const user = await getAuthenticatedUser(req, "TEACHER");
    if (!user) return errorResponse(401, "Unauthorized");

    const courseId = ctx?.params?.courseId;
    if (!courseId) return errorResponse(400, "Missing courseId");

    const existing = await assertTeacherOwnsCourse(user.id, courseId);
    if (!existing) return errorResponse(404, "Course not found");

    const body = await req.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ", {
        details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      });
    }

    const updated = await prisma.course.update({
      where: { id: courseId },
      data: {
        ...(parsed.data.title !== undefined ? { title: parsed.data.title.trim() } : {}),
        ...(parsed.data.description !== undefined
          ? { description: parsed.data.description?.toString().trim() || null }
          : {}),
        ...(parsed.data.coverImage !== undefined
          ? { coverImage: parsed.data.coverImage?.toString().trim() || null }
          : {}),
      },
      select: {
        id: true,
        title: true,
        description: true,
        coverImage: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { lessons: true, classrooms: true } },
      },
    });

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error) {
    console.error("[PATCH /api/teachers/courses/[courseId]] Error", error);
    return errorResponse(500, "Internal server error");
  }
}

export async function DELETE(req: NextRequest, ctx: { params: { courseId: string } }) {
  try {
    const user = await getAuthenticatedUser(req, "TEACHER");
    if (!user) return errorResponse(401, "Unauthorized");

    const courseId = ctx?.params?.courseId;
    if (!courseId) return errorResponse(400, "Missing courseId");

    const existing = await assertTeacherOwnsCourse(user.id, courseId);
    if (!existing) return errorResponse(404, "Course not found");

    await prisma.course.delete({ where: { id: courseId } });

    return NextResponse.json({ success: true, data: { deleted: true } }, { status: 200 });
  } catch (error) {
    console.error("[DELETE /api/teachers/courses/[courseId]] Error", error);
    return errorResponse(500, "Internal server error");
  }
}
