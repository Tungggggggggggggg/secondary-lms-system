import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, getRequestId, isTeacherOfClassroom } from "@/lib/api-utils";

// PATCH: Chỉnh sửa nội dung announcement (teacher sở hữu lớp)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const requestId = getRequestId(req);
  try {
    const id = params.id;
    if (!id) return NextResponse.json({ success: false, message: "id is required", requestId }, { status: 400 });

    const user = await getAuthenticatedUser(req, "TEACHER");
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized", requestId }, { status: 401 });

    const body = await req.json().catch(() => null);
    const content = typeof body?.content === "string" ? body.content.toString().trim() : undefined;
    const hasPin = typeof body?.pin === "boolean";

    const ann = await prisma.announcement.findUnique({ where: { id }, select: { classroomId: true } });
    if (!ann) return NextResponse.json({ success: false, message: "Announcement not found", requestId }, { status: 404 });

    const owns = await isTeacherOfClassroom(user.id, ann.classroomId);
    if (!owns) return NextResponse.json({ success: false, message: "Forbidden", requestId }, { status: 403 });

    if (!hasPin && (content == null || content === "")) {
      return NextResponse.json({ success: false, message: "No changes provided", requestId }, { status: 400 });
    }

    const data: any = {};
    if (typeof content === "string" && content.length > 0) data.content = content;
    if (hasPin) data.pinnedAt = body.pin ? new Date() : null;

    const updated = await prisma.announcement.update({ where: { id }, data });

    return NextResponse.json({ success: true, data: { id: updated.id, content: updated.content, pinnedAt: (updated as any).pinnedAt ?? null, updatedAt: updated.updatedAt }, requestId });
  } catch (error) {
    console.error(`[ERROR] [PATCH] /api/announcements/${params.id} {requestId:${requestId}}`, error);
    return NextResponse.json({ success: false, message: "Internal server error", requestId }, { status: 500 });
  }
}

// DELETE: Xoá announcement (teacher sở hữu lớp)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const requestId = getRequestId(req);
  try {
    const id = params.id;
    if (!id) return NextResponse.json({ success: false, message: "id is required", requestId }, { status: 400 });

    const user = await getAuthenticatedUser(req, "TEACHER");
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized", requestId }, { status: 401 });

    const ann = await prisma.announcement.findUnique({ where: { id }, select: { id: true, classroomId: true } });
    if (!ann) return NextResponse.json({ success: false, message: "Announcement not found", requestId }, { status: 404 });

    const owns = await isTeacherOfClassroom(user.id, ann.classroomId);
    if (!owns) return NextResponse.json({ success: false, message: "Forbidden", requestId }, { status: 403 });

    await prisma.announcement.delete({ where: { id } });

    return NextResponse.json({ success: true, data: { id }, requestId });
  } catch (error) {
    console.error(`[ERROR] [DELETE] /api/announcements/${params.id} {requestId:${requestId}}`, error);
    return NextResponse.json({ success: false, message: "Internal server error", requestId }, { status: 500 });
  }
}
