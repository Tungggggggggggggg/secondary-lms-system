import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { prisma } from "@/lib/prisma";
import {
  getAuthenticatedUser,
  getRequestId,
  isTeacherOfClassroom,
} from "@/lib/api-utils";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const BUCKET = process.env.SUPABASE_LESSONS_BUCKET || "lessons";

const MIME_WHITELIST = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
  "text/plain",
  "application/zip",
  "application/x-zip-compressed",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/x-python",
  "text/x-shellscript",
  "application/x-javascript",
]);

function slugifyFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-|-$|\s+/g, "");
}

// POST: Upload file đính kèm cho announcement (chỉ giáo viên sở hữu lớp)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = getRequestId(req);
  try {
    const announcementId = params.id;
    if (!announcementId) {
      return NextResponse.json(
        { success: false, message: "announcementId is required", requestId },
        { status: 400 }
      );
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized", requestId },
        { status: 401 }
      );
    }

    // Lấy classroom từ announcement
    const ann = await prisma.announcement.findUnique({
      where: { id: announcementId },
      select: { classroomId: true },
    });
    if (!ann) {
      return NextResponse.json(
        { success: false, message: "Announcement not found", requestId },
        { status: 404 }
      );
    }

    // Chỉ giáo viên sở hữu lớp mới được upload đính kèm
    const owns = await isTeacherOfClassroom(user.id, ann.classroomId);
    if (!owns) {
      return NextResponse.json(
        { success: false, message: "Forbidden - Not your classroom", requestId },
        { status: 403 }
      );
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: "file is required", requestId },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, message: "File exceeds 20MB limit", requestId },
        { status: 413 }
      );
    }

    const contentType = file.type || "application/octet-stream";
    if (contentType && !MIME_WHITELIST.has(contentType)) {
      return NextResponse.json(
        { success: false, message: "Unsupported file type", requestId },
        { status: 415 }
      );
    }

    const originalName = typeof (file as any).name === "string" ? (file as any).name : "file";
    const safeName = slugifyFileName(originalName);
    const key = `announcement/${announcementId}/${crypto.randomUUID()}-${safeName}`;

    const arrayBuffer = await file.arrayBuffer();
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(key, Buffer.from(arrayBuffer), {
        contentType,
        upsert: false,
      });

    if (error) {
      console.error(
        `[ERROR] [POST] /api/announcements/${announcementId}/attachments - Upload failed {requestId:${requestId}}`,
        error
      );
      return NextResponse.json(
        { success: false, message: "Upload failed", requestId },
        { status: 500 }
      );
    }

    const savedMeta = await prisma.announcementAttachment.create({
      data: {
        announcementId,
        path: data!.path,
        name: originalName,
        size: file.size,
        mimeType: contentType,
        uploadedById: user.id,
      },
      select: { id: true, name: true, path: true, size: true, mimeType: true, createdAt: true },
    });

    return NextResponse.json(
      { success: true, data: savedMeta, requestId },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      `[ERROR] [POST] /api/announcements/${params.id}/attachments {requestId:${requestId}}`,
      error
    );
    return NextResponse.json(
      { success: false, message: "Internal server error", requestId },
      { status: 500 }
    );
  }
}


