import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { errorResponse, getAuthenticatedUser } from "@/lib/api-utils";

export const runtime = "nodejs";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(200_000),
  order: z.number().int().min(1).max(10_000).optional(),
});

export async function GET(req: NextRequest, ctx: { params: { courseId: string } }) {
  try {
    const user = await getAuthenticatedUser(req, "TEACHER");
    if (!user) return errorResponse(401, "Unauthorized");

    const courseId = ctx?.params?.courseId;
    if (!courseId) return errorResponse(400, "Missing courseId");

    const course = await prisma.course.findFirst({ where: { id: courseId, authorId: user.id }, select: { id: true } });
    if (!course) return errorResponse(404, "Course not found");

    const lessons = await prisma.lesson.findMany({
      where: { courseId },
      orderBy: { order: "asc" },
      take: 500,
      select: { id: true, title: true, order: true, createdAt: true, updatedAt: true },
    });

    return NextResponse.json({ success: true, data: { items: lessons } }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/teachers/courses/[courseId]/lessons] Error", error);
    return errorResponse(500, "Internal server error");
  }
}

export async function POST(req: NextRequest, ctx: { params: { courseId: string } }) {
  try {
    const user = await getAuthenticatedUser(req, "TEACHER");
    if (!user) return errorResponse(401, "Unauthorized");

    const courseId = ctx?.params?.courseId;
    if (!courseId) return errorResponse(400, "Missing courseId");

    const course = await prisma.course.findFirst({ where: { id: courseId, authorId: user.id }, select: { id: true } });
    if (!course) return errorResponse(404, "Course not found");

    const body = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ", {
        details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      });
    }

    let order = parsed.data.order;
    if (!order) {
      const max = await prisma.lesson.aggregate({
        where: { courseId },
        _max: { order: true },
      });
      order = (max._max.order ?? 0) + 1;
    }

    const created = await prisma.lesson.create({
      data: {
        courseId,
        title: parsed.data.title.trim(),
        content: parsed.data.content,
        order,
      },
      select: { id: true, title: true, order: true, createdAt: true, updatedAt: true },
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/teachers/courses/[courseId]/lessons] Error", error);
    return errorResponse(500, "Internal server error");
  }
}
