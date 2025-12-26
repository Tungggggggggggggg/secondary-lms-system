import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase";
import {
  errorResponse,
  getAuthenticatedUser,
  isStudentInClassroom,
  isTeacherOfClassroom,
  getRequestId,
} from "@/lib/api-utils";

export const runtime = "nodejs";

const paramsSchema = z
  .object({
    fileId: z.string().min(1).max(100),
  })
  .strict();

export async function GET(
  req: NextRequest,
  { params }: { params: { fileId: string } }
) {
  const requestId = getRequestId(req);
  try {
    const parsedParams = paramsSchema.safeParse(params);
    if (!parsedParams.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ", {
        requestId,
        details: parsedParams.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      });
    }

    const fileId = parsedParams.data.fileId;

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return errorResponse(401, "Unauthorized", { requestId });
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
      return errorResponse(404, "Attachment not found", { requestId });
    }

    const classroomId = file.announcement.classroomId;

    // Quyền truy cập: giáo viên sở hữu lớp hoặc học sinh trong lớp
    const canAccess =
      (user.role === "TEACHER" && (await isTeacherOfClassroom(user.id, classroomId))) ||
      (user.role === "STUDENT" && (await isStudentInClassroom(user.id, classroomId)));

    if (!canAccess) {
      return errorResponse(403, "Forbidden", { requestId });
    }

    if (!supabaseAdmin) {
      return errorResponse(500, "Supabase admin client is not available", { requestId });
    }

    const bucket =
      process.env.SUPABASE_STORAGE_BUCKET ||
      process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ||
      process.env.SUPABASE_ANNOUNCEMENTS_BUCKET ||
      process.env.SUPABASE_LESSONS_BUCKET ||
      "lms-submissions";

    const admin = supabaseAdmin;
    const { data, error } = await admin.storage
      .from(bucket)
      .createSignedUrl(file.path, 60 * 5); // 5 phút

    if (error || !data?.signedUrl) {
      return errorResponse(500, "Failed to create signed URL", {
        requestId,
        details: error?.message || null,
      });
    }

    return NextResponse.json({ success: true, url: data.signedUrl, fileName: file.name, requestId }, { status: 200 });
  } catch (error) {
    console.error(`[ERROR] [GET] /api/announcements/attachments/${params.fileId}/download {requestId:${requestId}}`, error);
    return errorResponse(500, "Internal server error", { requestId });
  }
}
