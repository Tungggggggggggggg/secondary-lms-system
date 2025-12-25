import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, getRequestId, isTeacherOfClassroom, isStudentInClassroom } from "@/lib/api-utils";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const requestId = getRequestId(req);
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized", requestId }, { status: 401 });

    const announcementId = params.id;
    const ann = await prisma.announcement.findUnique({ where: { id: announcementId }, select: { classroomId: true } });
    if (!ann) return NextResponse.json({ success: false, message: "Announcement not found", requestId }, { status: 404 });

    // Chỉ cho phép giáo viên của lớp hoặc học sinh trong lớp xem trạng thái khoá bình luận
    const [isTeacher, isStudent] = await Promise.all([
      isTeacherOfClassroom(user.id, ann.classroomId),
      isStudentInClassroom(user.id, ann.classroomId),
    ]);
    if (!isTeacher && !isStudent) {
      return NextResponse.json({ success: false, message: "Forbidden", requestId }, { status: 403 });
    }

    const rows = await prisma.$queryRaw<{ comments_locked: boolean }[]>`SELECT "comments_locked" FROM "announcements" WHERE id = ${announcementId} LIMIT 1`;
    const locked = Array.isArray(rows) && rows[0]?.comments_locked ? true : false;
    return NextResponse.json({ success: true, locked, requestId }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Internal server error", requestId: getRequestId(req) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const requestId = getRequestId(req);
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized", requestId }, { status: 401 });

    const announcementId = params.id;
    const ann = await prisma.announcement.findUnique({ where: { id: announcementId }, select: { classroomId: true } });
    if (!ann) return NextResponse.json({ success: false, message: "Announcement not found", requestId }, { status: 404 });

    const isTeacher = await isTeacherOfClassroom(user.id, ann.classroomId);
    if (!isTeacher) return NextResponse.json({ success: false, message: "Forbidden", requestId }, { status: 403 });

    const body = await req.json().catch(() => null);
    const locked = Boolean(body?.locked);

    await prisma.$executeRawUnsafe(`UPDATE "announcements" SET "comments_locked" = $1 WHERE id = $2`, locked, announcementId);

    // Audit log cho thao tác khóa/mở khóa bình luận
    try {
      const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim();
      const userAgent = req.headers.get("user-agent") || undefined;
      const classroom = await prisma.classroom.findUnique({ where: { id: ann.classroomId }, select: { organizationId: true } });
      await prisma.auditLog.create({
        data: {
          actorId: user.id,
          actorRole: user.role,
          action: locked ? "COMMENTS_LOCK" : "COMMENTS_UNLOCK",
          entityType: "Announcement",
          entityId: announcementId,
          organizationId: classroom?.organizationId || undefined,
          ip,
          userAgent,
          metadata: { locked },
        },
      });
    } catch {}

    return NextResponse.json({ success: true, locked, requestId }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Internal server error", requestId }, { status: 500 });
  }
}
