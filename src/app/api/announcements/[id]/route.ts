import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { errorResponse, getAuthenticatedUser, getRequestId, isTeacherOfClassroom } from "@/lib/api-utils";

const patchSchema = z
  .object({
    content: z.string().min(1).max(5000).optional(),
    pin: z.boolean().optional(),
  })
  .strict();

// PATCH: Chỉnh sửa nội dung announcement (teacher sở hữu lớp)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const requestId = getRequestId(req);
  try {
    const id = params.id;
    if (!id) return errorResponse(400, "id is required", { requestId });

    const user = await getAuthenticatedUser(req);
    if (!user) return errorResponse(401, "Unauthorized", { requestId });
    if (user.role !== "TEACHER") return errorResponse(403, "Forbidden", { requestId });

    const rawBody: unknown = await req.json().catch(() => null);
    const parsedBody = patchSchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ", {
        requestId,
        details: parsedBody.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      });
    }

    const content = typeof parsedBody.data.content === "string" ? parsedBody.data.content.trim() : undefined;
    const hasPin = typeof parsedBody.data.pin === "boolean";

    const ann = await prisma.announcement.findUnique({ where: { id }, select: { classroomId: true } });
    if (!ann) return errorResponse(404, "Announcement not found", { requestId });

    const owns = await isTeacherOfClassroom(user.id, ann.classroomId);
    if (!owns) return errorResponse(403, "Forbidden", { requestId });

    if (!hasPin && (content == null || content === "")) {
      return errorResponse(400, "No changes provided", { requestId });
    }

    const data: { content?: string; pinnedAt?: Date | null } = {};
    if (typeof content === "string" && content.length > 0) data.content = content;
    if (hasPin) data.pinnedAt = parsedBody.data.pin ? new Date() : null;

    const updated = await prisma.announcement.update({
      where: { id },
      data,
      select: { id: true, content: true, pinnedAt: true, updatedAt: true },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: updated.id,
          content: updated.content,
          pinnedAt: updated.pinnedAt ?? null,
          updatedAt: updated.updatedAt,
        },
        requestId,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error(`[ERROR] [PATCH] /api/announcements/${params.id} {requestId:${requestId}}`, error);
    return errorResponse(500, "Internal server error", { requestId });
  }
}

// DELETE: Xoá announcement (teacher sở hữu lớp)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const requestId = getRequestId(req);
  try {
    const id = params.id;
    if (!id) return errorResponse(400, "id is required", { requestId });

    const user = await getAuthenticatedUser(req);
    if (!user) return errorResponse(401, "Unauthorized", { requestId });
    if (user.role !== "TEACHER") return errorResponse(403, "Forbidden", { requestId });

    const ann = await prisma.announcement.findUnique({ where: { id }, select: { id: true, classroomId: true } });
    if (!ann) return errorResponse(404, "Announcement not found", { requestId });

    const owns = await isTeacherOfClassroom(user.id, ann.classroomId);
    if (!owns) return errorResponse(403, "Forbidden", { requestId });

    await prisma.announcement.delete({ where: { id } });

    return NextResponse.json({ success: true, data: { id }, requestId });
  } catch (error: unknown) {
    console.error(`[ERROR] [DELETE] /api/announcements/${params.id} {requestId:${requestId}}`, error);
    return errorResponse(500, "Internal server error", { requestId });
  }
}
