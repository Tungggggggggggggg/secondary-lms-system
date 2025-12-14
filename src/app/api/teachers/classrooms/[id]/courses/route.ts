import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { errorResponse, getAuthenticatedUser } from "@/lib/api-utils";

export const runtime = "nodejs";

const addSchema = z.object({
  courseId: z.string().min(1),
});

export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const user = await getAuthenticatedUser(req, "TEACHER");
    if (!user) return errorResponse(401, "Unauthorized");

    const classroomId = ctx?.params?.id;
    if (!classroomId) return errorResponse(400, "Missing classroomId");

    const classroom = await prisma.classroom.findFirst({
      where: { id: classroomId, teacherId: user.id, isActive: true },
      select: { id: true },
    });
    if (!classroom) return errorResponse(404, "Classroom not found");

    const items = await prisma.classroomCourse.findMany({
      where: { classroomId },
      orderBy: { addedAt: "desc" },
      take: 200,
      select: {
        id: true,
        addedAt: true,
        course: { select: { id: true, title: true, description: true, coverImage: true, updatedAt: true } },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          items: items.map((x) => ({
            id: x.course.id,
            title: x.course.title,
            description: x.course.description,
            coverImage: x.course.coverImage,
            addedAt: x.addedAt,
            updatedAt: x.course.updatedAt,
          })),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[GET /api/teachers/classrooms/[id]/courses] Error", error);
    return errorResponse(500, "Internal server error");
  }
}

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const user = await getAuthenticatedUser(req, "TEACHER");
    if (!user) return errorResponse(401, "Unauthorized");

    const classroomId = ctx?.params?.id;
    if (!classroomId) return errorResponse(400, "Missing classroomId");

    const classroom = await prisma.classroom.findFirst({
      where: { id: classroomId, teacherId: user.id, isActive: true },
      select: { id: true },
    });
    if (!classroom) return errorResponse(404, "Classroom not found");

    const body = await req.json().catch(() => null);
    const parsed = addSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ", {
        details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      });
    }

    const course = await prisma.course.findFirst({
      where: { id: parsed.data.courseId, authorId: user.id },
      select: { id: true },
    });
    if (!course) return errorResponse(404, "Course not found");

    await prisma.classroomCourse.upsert({
      where: { classroomId_courseId: { classroomId, courseId: course.id } },
      update: {},
      create: { classroomId, courseId: course.id },
    });

    return NextResponse.json({ success: true, data: { classroomId, courseId: course.id } }, { status: 200 });
  } catch (error) {
    console.error("[POST /api/teachers/classrooms/[id]/courses] Error", error);
    return errorResponse(500, "Internal server error");
  }
}
