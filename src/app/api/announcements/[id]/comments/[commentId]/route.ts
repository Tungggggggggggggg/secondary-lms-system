import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, getRequestId, isTeacherOfClassroom } from "@/lib/api-utils";
import { UserRole, ModerationStatus } from "@prisma/client";

// PATCH: Hide/Unhide comment (teacher of the classroom only)
export async function PATCH(req: NextRequest, { params }: { params: { id: string; commentId: string } }) {
  const requestId = getRequestId(req);
  try {
    const announcementId = params.id;
    const commentId = params.commentId;

    const user = await getAuthenticatedUser(req);
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized", requestId }, { status: 401 });

    // Load classroom of announcement
    const ann = await prisma.announcement.findUnique({ where: { id: announcementId }, select: { classroomId: true } });
    if (!ann) return NextResponse.json({ success: false, message: "Announcement not found", requestId }, { status: 404 });

    if (user.role !== UserRole.TEACHER || !(await isTeacherOfClassroom(user.id, ann.classroomId))) {
      return NextResponse.json({ success: false, message: "Forbidden", requestId }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const action = (body?.action || "").toString();

    if (!["hide", "unhide"].includes(action)) {
      return NextResponse.json({ success: false, message: "Invalid action", requestId }, { status: 400 });
    }

    // Ensure comment belongs to this announcement
    const comment = await prisma.announcementComment.findUnique({ where: { id: commentId }, select: { announcementId: true } });
    if (!comment || comment.announcementId !== announcementId) {
      return NextResponse.json({ success: false, message: "Comment not found", requestId }, { status: 404 });
    }

    const updated = await prisma.announcementComment.update({
      where: { id: commentId },
      data: {
        status: action === "hide" ? ModerationStatus.REJECTED : ModerationStatus.APPROVED,
        moderatedAt: new Date(),
        moderatedById: user.id,
      },
      select: { id: true, status: true },
    });

    // Audit log
    try {
      const ip = (req.headers.get("x-forwarded-for") || (req as any).ip || "").split(",")[0].trim();
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
    return NextResponse.json({ success: false, message: "Internal server error", requestId }, { status: 500 });
  }
}

// DELETE: Soft-delete comment (set status REJECTED) by teacher
export async function DELETE(req: NextRequest, { params }: { params: { id: string; commentId: string } }) {
  const requestId = getRequestId(req);
  try {
    const announcementId = params.id;
    const commentId = params.commentId;

    const user = await getAuthenticatedUser(req);
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized", requestId }, { status: 401 });

    const ann = await prisma.announcement.findUnique({ where: { id: announcementId }, select: { classroomId: true } });
    if (!ann) return NextResponse.json({ success: false, message: "Announcement not found", requestId }, { status: 404 });

    if (user.role !== UserRole.TEACHER || !(await isTeacherOfClassroom(user.id, ann.classroomId))) {
      return NextResponse.json({ success: false, message: "Forbidden", requestId }, { status: 403 });
    }

    const comment = await prisma.announcementComment.findUnique({ where: { id: commentId }, select: { announcementId: true } });
    if (!comment || comment.announcementId !== announcementId) {
      return NextResponse.json({ success: false, message: "Comment not found", requestId }, { status: 404 });
    }

    const updated = await prisma.announcementComment.update({
      where: { id: commentId },
      data: {
        status: ModerationStatus.REJECTED,
        moderatedAt: new Date(),
        moderatedById: user.id,
      },
      select: { id: true, status: true },
    });

    // Audit log
    try {
      const ip = (req.headers.get("x-forwarded-for") || (req as any).ip || "").split(",")[0].trim();
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
    return NextResponse.json({ success: false, message: "Internal server error", requestId }, { status: 500 });
  }
}
