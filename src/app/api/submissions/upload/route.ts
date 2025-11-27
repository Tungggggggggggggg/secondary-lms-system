import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/api-utils";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "lms-submissions";

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
        const user = await getAuthenticatedUser(req, "STUDENT");
        if (!user) {
            return NextResponse.json({ success: false, message: "Unauthorized", requestId }, { status: 401 });
        }

        const url = new URL(req.url);
        const assignmentId = url.searchParams.get("assignmentId");
        if (!assignmentId) {
            return NextResponse.json({ success: false, message: "assignmentId is required", requestId }, { status: 400 });
        }

        const form = await req.formData();
        const file = form.get("file");
        if (!file || !(file instanceof File)) {
            return NextResponse.json({ success: false, message: "file is required", requestId }, { status: 400 });
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ success: false, message: "File exceeds 20MB limit", requestId }, { status: 413 });
        }

        const contentType = file.type || "application/octet-stream";
        if (contentType && !MIME_WHITELIST.has(contentType)) {
            return NextResponse.json({ success: false, message: "Unsupported file type", requestId }, { status: 415 });
        }

        const originalName = typeof (file as File).name === "string" ? (file as File).name : "file";
        const safeName = slugifyFileName(originalName);
        const key = `submissions/${assignmentId}/${user.id}/${crypto.randomUUID()}-${safeName}`;

        const arrayBuffer = await file.arrayBuffer();
        if (!supabaseAdmin) {
            return NextResponse.json({ success: false, message: "Supabase admin client is not available", requestId }, { status: 500 });
        }
        const admin = supabaseAdmin;
        const { data, error } = await admin.storage
            .from(BUCKET)
            .upload(key, Buffer.from(arrayBuffer), { contentType, upsert: false });

        if (error) {
            console.error(`[ERROR] [POST] /api/submissions/upload - Upload failed {requestId:${requestId}}`, error);
            return NextResponse.json({ success: false, message: "Upload failed", requestId }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: "File uploaded",
            data: { storagePath: data?.path, fileName: originalName, mimeType: contentType, sizeBytes: file.size },
            requestId,
        }, { status: 201 });
    } catch (error) {
        console.error(`[ERROR] [POST] /api/submissions/upload {requestId:${requestId}}`, error);
        return NextResponse.json({ success: false, message: "Internal server error", requestId }, { status: 500 });
    }
}


