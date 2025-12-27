import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, getAuthenticatedUser, getRequestId } from "@/lib/api-utils";
import { logger } from "@/lib/logging/logger";
import { isConversationParticipant, listAttachments } from "@/lib/repositories/chat";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

const paramsSchema = z
  .object({
    conversationId: z.string().min(1).max(100),
  })
  .strict();

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const CHAT_BUCKET = process.env.SUPABASE_CHAT_BUCKET || "chat-files";

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
]);

function slugifyFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$|\s+/g, "");
}

export async function GET(req: NextRequest, { params }: { params: { conversationId: string } }) {
  const requestId = getRequestId(req);
  const user = await getAuthenticatedUser(req);
  if (!user) return errorResponse(401, "Unauthorized", { requestId });

  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) {
    return errorResponse(400, "Dữ liệu không hợp lệ", {
      requestId,
      details: parsedParams.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    });
  }

  const { conversationId } = parsedParams.data;

  const allowed = await isConversationParticipant(conversationId, user.id);
  if (!allowed) return errorResponse(403, "Forbidden", { requestId });

  try {
    const attachments = await listAttachments(conversationId);

    const admin = supabaseAdmin;
    const filesRaw = Array.isArray(attachments?.files) ? attachments.files : [];
    const files = await Promise.all(
      filesRaw.map(async (f: { id: string; name: string; mimeType: string; sizeBytes: number; storagePath: string }) => {
        let url: string | null = null;
        if (admin) {
          try {
            const { data, error } = await admin.storage
              .from(CHAT_BUCKET)
              .createSignedUrl(f.storagePath, 900);
            if (error) {
              logger.error("chat:createSignedUrl:error", {
                requestId,
                conversationId,
                userId: user.id,
                fileId: f.id,
                path: f.storagePath,
                error: error.message,
              });
            } else {
              url = data?.signedUrl || null;
            }
          } catch (e) {
            logger.error("chat:createSignedUrl:exception", {
              requestId,
              conversationId,
              userId: user.id,
              fileId: f.id,
              path: f.storagePath,
              error: String(e),
            });
          }
        }
        return {
          ...f,
          url,
        };
      })
    );

    return NextResponse.json({ success: true, data: { ...attachments, files } });
  } catch (e) {
    logger.error("chat:listAttachments:error", { requestId, conversationId, userId: user.id, error: String(e) });
    return errorResponse(500, "Lỗi khi tải tệp đính kèm", { requestId });
  }
}

export async function POST(req: NextRequest, { params }: { params: { conversationId: string } }) {
  const requestId = getRequestId(req);
  const user = await getAuthenticatedUser(req);
  if (!user) return errorResponse(401, "Unauthorized", { requestId });

  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) {
    return errorResponse(400, "Dữ liệu không hợp lệ", {
      requestId,
      details: parsedParams.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    });
  }
  const { conversationId } = parsedParams.data;

  const allowed = await isConversationParticipant(conversationId, user.id);
  if (!allowed) return errorResponse(403, "Forbidden", { requestId });

  const admin = supabaseAdmin;
  if (!admin) {
    return errorResponse(500, "Supabase admin client is not available", { requestId });
  }

  try {
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

    const originalName = typeof file.name === "string" && file.name.trim() ? file.name : "file";
    const safeName = slugifyFileName(originalName);
    const key = `chat/${conversationId}/${crypto.randomUUID()}-${safeName}`;

    const arrayBuffer = await file.arrayBuffer();
    const { data, error } = await admin.storage
      .from(CHAT_BUCKET)
      .upload(key, Buffer.from(arrayBuffer), {
        contentType,
        upsert: false,
      });

    if (error || !data?.path) {
      logger.error("chat:uploadAttachment:error", {
        requestId,
        conversationId,
        userId: user.id,
        error: error?.message ?? "Unknown storage error",
      });
      return errorResponse(500, "Upload failed", {
        requestId,
        details: error?.message ?? null,
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          path: data.path,
          name: originalName,
          mimeType: contentType,
          sizeBytes: file.size,
        },
        requestId,
      },
      { status: 201 }
    );
  } catch (e) {
    logger.error("chat:uploadAttachment:exception", {
      requestId,
      conversationId,
      userId: user.id,
      error: String(e),
    });
    return errorResponse(500, "Internal server error", { requestId });
  }
}
