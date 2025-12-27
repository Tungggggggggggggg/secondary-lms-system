import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, getAuthenticatedUser, getRequestId, isTeacherOfClassroom } from "@/lib/api-utils";
import { z } from "zod";

const paramsSchema = z
  .object({
    id: z.string().min(1).max(100),
    commentId: z.string().min(1).max(100),
  })
  .strict();

const patchBodySchema = z
  .object({
    action: z.enum(["hide", "unhide"]),
  })
  .passthrough();

// PATCH: Hide/Unhide comment (teacher of the classroom only)
export async function PATCH(req: NextRequest, { params }: { params: { id: string; commentId: string } }) {
  const requestId = getRequestId(req);
  try {
    const parsedParams = paramsSchema.safeParse(params);
    if (!parsedParams.success) return errorResponse(400, "Dữ liệu không hợp lệ", { requestId });

    const announcementId = parsedParams.data.id;
    const commentId = parsedParams.data.commentId;

    const user = await getAuthenticatedUser(req);
    if (!user) return errorResponse(401, "Unauthorized", { requestId });

    // Load classroom of announcement
    const ann = await prisma.announcement.findUnique({ where: { id: announcementId }, select: { classroomId: true } });
    if (!ann) return errorResponse(404, "Announcement not found", { requestId });

    if (user.role !== "TEACHER" || !(await isTeacherOfClassroom(user.id, ann.classroomId))) {
      return errorResponse(403, "Forbidden", { requestId });
    }

    const rawBody: unknown = await req.json().catch(() => null);
    const parsedBody = patchBodySchema.safeParse(rawBody);
    if (!parsedBody.success) return errorResponse(400, "Invalid action", { requestId });

    const action = parsedBody.data.action;

    // Ensure comment belongs to this announcement
    const comment = await prisma.announcementComment.findUnique({ where: { id: commentId }, select: { announcementId: true } });
    if (!comment || comment.announcementId !== announcementId) {
      return errorResponse(404, "Comment not found", { requestId });
    }

    const updated = await prisma.announcementComment.update({
      where: { id: commentId },
      data: {
        status: action === "hide" ? "REJECTED" : "APPROVED",
        moderatedAt: new Date(),
        moderatedById: user.id,
      },
      select: { id: true, status: true },
    });

    // Audit log
    try {
      const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim();
      const userAgent = req.headers.get("user-agent") || undefined;
      const classroom = await prisma.classroom.findUnique({ where: { id: ann.classroomId }, select: { organizationId: true } });
      await prisma.auditLog.create({
        data: {
          actorId: user.id,
          actorRole: user.role,
          action: action === "hide" ? "COMMENT_HIDE" : "COMMENT_UNHIDE",
          entityType: "AnnouncementComment",
          entityId: commentId,
          organizationId: classroom?.organizationId || undefined,
          ip,
          userAgent,
          metadata: { announcementId },
        },
      });
    } catch {}

    return NextResponse.json({ success: true, data: updated, requestId }, { status: 200 });
  } catch (error) {
    console.error(`[ERROR] [PATCH] /api/announcements/${params.id}/comments/${params.commentId} {requestId:${requestId}}`, error);
    return errorResponse(500, "Internal server error", { requestId });
  }
}

// DELETE: Soft-delete comment (set status REJECTED) by teacher
export async function DELETE(req: NextRequest, { params }: { params: { id: string; commentId: string } }) {
  const requestId = getRequestId(req);
  try {
    const parsedParams = paramsSchema.safeParse(params);
    if (!parsedParams.success) return errorResponse(400, "Dữ liệu không hợp lệ", { requestId });

    const announcementId = parsedParams.data.id;
    const commentId = parsedParams.data.commentId;

    const user = await getAuthenticatedUser(req);
    if (!user) return errorResponse(401, "Unauthorized", { requestId });

    const ann = await prisma.announcement.findUnique({ where: { id: announcementId }, select: { classroomId: true } });
    if (!ann) return errorResponse(404, "Announcement not found", { requestId });

    if (user.role !== "TEACHER" || !(await isTeacherOfClassroom(user.id, ann.classroomId))) {
      return errorResponse(403, "Forbidden", { requestId });
    }

    const comment = await prisma.announcementComment.findUnique({ where: { id: commentId }, select: { announcementId: true } });
    if (!comment || comment.announcementId !== announcementId) {
      return errorResponse(404, "Comment not found", { requestId });
    }

    const updated = await prisma.announcementComment.update({
      where: { id: commentId },
      data: {
        status: "REJECTED",
        moderatedAt: new Date(),
        moderatedById: user.id,
      },
      select: { id: true, status: true },
    });

    // Audit log
    try {
      const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim();
      const userAgent = req.headers.get("user-agent") || undefined;
      const classroom = await prisma.classroom.findUnique({ where: { id: ann.classroomId }, select: { organizationId: true } });
      await prisma.auditLog.create({
        data: {
          actorId: user.id,
          actorRole: user.role,
          action: "COMMENT_DELETE",
          entityType: "AnnouncementComment",
          entityId: commentId,
          organizationId: classroom?.organizationId || undefined,
          ip,
          userAgent,
          metadata: { announcementId },
        },
      });
    } catch {}

    return NextResponse.json({ success: true, data: updated, requestId }, { status: 200 });
  } catch (error) {
    console.error(`[ERROR] [DELETE] /api/announcements/${params.id}/comments/${params.commentId} {requestId:${requestId}}`, error);
    return errorResponse(500, "Internal server error", { requestId });
  }
}
