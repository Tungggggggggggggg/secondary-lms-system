import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { errorResponse, getAuthenticatedUser, isTeacherOfAssignment } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const BUCKET =
  process.env.SUPABASE_ASSIGNMENTS_BUCKET ||
  process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ||
  "lms-submissions";

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
		.replace(/-+/g, "-")
		.replace(/^-|-$|\s+/g, "");
}

export async function POST(
	req: NextRequest,
	{ params }: { params: { id: string } }
) {
	const requestId = crypto.randomUUID();
	try {
		const admin = supabaseAdmin;
		if (!admin) {
			return errorResponse(500, "Storage client not initialized", { requestId });
		}
		const user = await getAuthenticatedUser(req);
		if (!user) return errorResponse(401, "Unauthorized", { requestId });
		if (user.role !== "TEACHER") return errorResponse(403, "Forbidden", { requestId });

		const assignmentId = params.id;
		if (!assignmentId) {
			return errorResponse(400, "assignmentId is required", { requestId });
		}

		const isOwner = await isTeacherOfAssignment(user.id, assignmentId);
		if (!isOwner) {
			return errorResponse(403, "Forbidden - Not your assignment", { requestId });
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

		const originalName = file.name?.trim() ? file.name : "file";
		const safeName = slugifyFileName(originalName);
		const key = `assignment/${assignmentId}/${crypto.randomUUID()}-${safeName}`;

		const arrayBuffer = await file.arrayBuffer();
		const { data, error } = await admin.storage
			.from(BUCKET)
			.upload(key, Buffer.from(arrayBuffer), {
				contentType,
				upsert: false,
			});

		if (error) {
			console.error(
				`[ERROR] [POST] /api/assignments/${assignmentId}/upload - Upload failed {requestId:${requestId}}`,
				error
			);
			return errorResponse(500, "Upload failed", { requestId });
		}

		let savedMeta: { id: string } | null = null;
		try {
			savedMeta = await prisma.assignmentFile.create({
				data: {
					assignmentId,
					path: data!.path,
					name: originalName,
					size: file.size,
					mimeType: contentType,
					uploadedById: user.id,
					file_type: 'ATTACHMENT',
				},
				select: { id: true },
			});
		} catch (dbErr) {
			console.error(
				`[ERROR] [POST] /api/assignments/${assignmentId}/upload - DB save failed {requestId:${requestId}}`,
				dbErr
			);
		}

		return NextResponse.json(
			{
				success: true,
				message: "File uploaded",
				data: { path: data?.path, name: originalName, mimeType: contentType, size: file.size, id: savedMeta?.id },
				requestId,
			},
			{ status: 201 }
		);
	} catch (error: unknown) {
		console.error(
			`[ERROR] [POST] /api/assignments/${params.id}/upload - Error {requestId:${requestId}}`,
			error
		);
		return errorResponse(500, "Internal server error", { requestId });
	}
}


