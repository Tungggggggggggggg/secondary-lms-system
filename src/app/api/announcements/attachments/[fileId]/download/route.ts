import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase";
import { getAuthenticatedUser, isStudentInClassroom, isTeacherOfClassroom, getRequestId } from "@/lib/api-utils";

export async function GET(
  req: NextRequest,
  { params }: { params: { fileId: string } }
) {
  const requestId = getRequestId(req);
  try {
    const fileId = params.fileId;
    if (!fileId) {
      return NextResponse.json({ success: false, message: "fileId is required", requestId }, { status: 400 });
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized", requestId }, { status: 401 });
    }

    // Tìm file và liên kết announcement -> classroom
    const file = await prisma.announcementAttachment.findUnique({
      where: { id: fileId },
      select: {
        id: true,
        name: true,
        path: true,
        announcement: { select: { classroomId: true } },
      },
    });
    if (!file) {
      return NextResponse.json({ success: false, message: "Attachment not found", requestId }, { status: 404 });
    }

    const classroomId = file.announcement.classroomId;

    // Quyền truy cập: giáo viên sở hữu lớp hoặc học sinh trong lớp
    const canAccess =
      (user.role === "TEACHER" && (await isTeacherOfClassroom(user.id, classroomId))) ||
      (user.role === "STUDENT" && (await isStudentInClassroom(user.id, classroomId)));

    if (!canAccess) {
      return NextResponse.json({ success: false, message: "Forbidden", requestId }, { status: 403 });
    }

    const bucket = process.env.SUPABASE_LESSONS_BUCKET || "lessons";
    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, message: "Supabase admin client is not available", requestId }, { status: 500 });
    }
    const admin = supabaseAdmin;
    const { data, error } = await admin.storage
      .from(bucket)
      .createSignedUrl(file.path, 60 * 5); // 5 phút

    if (error || !data?.signedUrl) {
      return NextResponse.json({ success: false, message: "Failed to create signed URL", requestId }, { status: 500 });
    }

    return NextResponse.json({ success: true, url: data.signedUrl, fileName: file.name, requestId }, { status: 200 });
  } catch (error) {
    console.error(`[ERROR] [GET] /api/announcements/attachments/${params.fileId}/download {requestId:${requestId}}`, error);
    return NextResponse.json({ success: false, message: "Internal server error", requestId }, { status: 500 });
  }
}
