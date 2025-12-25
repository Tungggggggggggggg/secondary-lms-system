import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { errorResponse, getAuthenticatedUser } from "@/lib/api-utils";

export const runtime = "nodejs";

export async function DELETE(
  req: NextRequest,
  ctx: { params: { id: string; courseId: string } }
) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return errorResponse(401, "Unauthorized");
    if (user.role !== "TEACHER") return errorResponse(403, "Forbidden");

    const classroomId = ctx?.params?.id;
    const courseId = ctx?.params?.courseId;
    if (!classroomId || !courseId) return errorResponse(400, "Missing params");

    const classroom = await prisma.classroom.findFirst({
      where: { id: classroomId, teacherId: user.id, isActive: true },
      select: { id: true },
    });
    if (!classroom) return errorResponse(404, "Classroom not found");

    await prisma.classroomCourse
      .delete({ where: { classroomId_courseId: { classroomId, courseId } } })
      .catch(() => null);

    return NextResponse.json({ success: true, data: { deleted: true } }, { status: 200 });
  } catch (error) {
    console.error("[DELETE /api/teachers/classrooms/[id]/courses/[courseId]] Error", error);
    return errorResponse(500, "Internal server error");
  }
}
