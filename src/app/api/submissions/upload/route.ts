import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { z } from "zod";
import { errorResponse, getAuthenticatedUser } from "@/lib/api-utils";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "lms-submissions";

const querySchema = z
    .object({
        assignmentId: z.string().min(1).max(100),
    })
    .strict();

const MIME_WHITELIST = new Set([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "text/plain",
    "image/png",
    "image/jpeg",
    "application/zip",
]);

function slugifyFileName(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9.]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$|\s+/g, "");
}

export async function POST(req: NextRequest) {
    const requestId = crypto.randomUUID();
    try {
        const user = await getAuthenticatedUser(req);
        if (!user) return errorResponse(401, "Unauthorized", { requestId });
        if (user.role !== "STUDENT") return errorResponse(403, "Forbidden", { requestId });

        const url = new URL(req.url);
        const parsedQuery = querySchema.safeParse({
            assignmentId: url.searchParams.get("assignmentId") ?? "",
        });
        if (!parsedQuery.success) {
            return errorResponse(400, "Dữ liệu không hợp lệ", {
                requestId,
                details: parsedQuery.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
            });
        }

        const { assignmentId } = parsedQuery.data;

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
        const key = `submissions/${assignmentId}/${user.id}/${crypto.randomUUID()}-${safeName}`;

        const arrayBuffer = await file.arrayBuffer();
        if (!supabaseAdmin) {
            return errorResponse(500, "Supabase admin client is not available", { requestId });
        }
        const admin = supabaseAdmin;
        const { data, error } = await admin.storage
            .from(BUCKET)
            .upload(key, Buffer.from(arrayBuffer), { contentType, upsert: false });

        if (error) {
            console.error(`[ERROR] [POST] /api/submissions/upload - Upload failed {requestId:${requestId}}`, error);
            return errorResponse(500, "Upload failed", { requestId });
        }

        return NextResponse.json({
            success: true,
            message: "File uploaded",
            data: { storagePath: data?.path, fileName: originalName, mimeType: contentType, sizeBytes: file.size },
            requestId,
        }, { status: 201 });
    } catch (error: unknown) {
        console.error(`[ERROR] [POST] /api/submissions/upload {requestId:${requestId}}`, error);
        return errorResponse(500, "Internal server error", { requestId });
    }
}


