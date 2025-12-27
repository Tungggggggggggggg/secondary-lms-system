import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";
import { prisma } from "@/lib/prisma";
import {
  errorResponse,
  getAuthenticatedUser,
  getRequestId,
  isTeacherOfClassroom,
  isStudentInClassroom,
} from "@/lib/api-utils";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const BUCKET =
  process.env.SUPABASE_STORAGE_BUCKET ||
  process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ||
  process.env.SUPABASE_ANNOUNCEMENTS_BUCKET ||
  process.env.SUPABASE_LESSONS_BUCKET ||
  "lms-submissions";

const paramsSchema = z
  .object({
    id: z.string().min(1).max(100),
  })
  .strict();

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

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
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

    const announcementId = parsedParams.data.id;

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return errorResponse(401, "Unauthorized", { requestId });
    }

    const ann = await prisma.announcement.findUnique({
      where: { id: announcementId },
      select: { classroomId: true },
    });
    if (!ann) {
      return errorResponse(404, "Announcement not found", { requestId });
    }

    const canAccess =
      (user.role === "TEACHER" && (await isTeacherOfClassroom(user.id, ann.classroomId))) ||
      (user.role === "STUDENT" && (await isStudentInClassroom(user.id, ann.classroomId)));

    if (!canAccess) {
      return errorResponse(403, "Forbidden", { requestId });
    }

    const items = await prisma.announcementAttachment.findMany({
      where: { announcementId },
      select: {
        id: true,
        name: true,
        path: true,
        size: true,
        mimeType: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(
      { success: true, data: items, requestId },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error(
      `[ERROR] [GET] /api/announcements/${params.id}/attachments {requestId:${requestId}}`,
      error
    );
    return errorResponse(500, "Internal server error", { requestId });
  }
}

// POST: Upload file đính kèm cho announcement (chỉ giáo viên sở hữu lớp)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
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

    const announcementId = parsedParams.data.id;

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return errorResponse(401, "Unauthorized", { requestId });
    }
    if (user.role !== "TEACHER") {
      return errorResponse(403, "Forbidden", { requestId });
    }

    // Lấy classroom từ announcement
    const ann = await prisma.announcement.findUnique({
      where: { id: announcementId },
      select: { classroomId: true },
    });
    if (!ann) {
      return errorResponse(404, "Announcement not found", { requestId });
    }

    // Chỉ giáo viên sở hữu lớp mới được upload đính kèm
    const owns = await isTeacherOfClassroom(user.id, ann.classroomId);
    if (!owns) {
      return errorResponse(403, "Forbidden - Not your classroom", { requestId });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return errorResponse(400, "file is required", { requestId });
    }

    if (file.size > MAX_FILE_SIZE) {
      return errorResponse(413, "File exceeds 20MB limit", { requestId });
    }

    const contentType = file.type || "application/octet-stream";
    if (contentType && !MIME_WHITELIST.has(contentType)) {
      return errorResponse(415, "Unsupported file type", { requestId });
    }

    const originalName = typeof (file as File).name === "string" ? (file as File).name : "file";
    const safeName = slugifyFileName(originalName);
    const key = `announcement/${announcementId}/${crypto.randomUUID()}-${safeName}`;

    const arrayBuffer = await file.arrayBuffer();
    // Guard: đảm bảo supabaseAdmin có sẵn trong môi trường server
    if (!supabaseAdmin) {
      console.error(`[ERROR] [POST] /api/announcements/${announcementId}/attachments - Supabase admin client is not available {requestId:${requestId}}`);
      return errorResponse(500, "Supabase admin client is not available", { requestId });
    }
    const client = supabaseAdmin;
    const { data, error } = await client.storage
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
      return errorResponse(500, "Upload failed", { requestId });
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
    return errorResponse(500, "Internal server error", { requestId });
  }
}


