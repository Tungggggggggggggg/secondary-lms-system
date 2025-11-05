import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/api-utils";
import { UserRole } from "@prisma/client";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "lms-submissions";
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

interface IncomingFileMeta {
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    storagePath: string;
}

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser(req, UserRole.STUDENT);
        if (!user) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { assignmentId, files } = body as { assignmentId?: string; files?: IncomingFileMeta[] };
        if (!assignmentId || !Array.isArray(files) || files.length === 0) {
            return NextResponse.json({ success: false, message: "assignmentId and files are required" }, { status: 400 });
        }

        // Validate files
        for (const f of files) {
            if (!f || typeof f.fileName !== "string" || typeof f.storagePath !== "string") {
                return NextResponse.json({ success: false, message: "Invalid file metadata" }, { status: 400 });
            }
            if (typeof f.sizeBytes !== "number" || f.sizeBytes <= 0 || f.sizeBytes > MAX_FILE_SIZE) {
                return NextResponse.json({ success: false, message: `File ${f.fileName} exceeds 20MB` }, { status: 413 });
            }
            if (!f.storagePath.startsWith("submissions/")) {
                return NextResponse.json({ success: false, message: "Invalid storage path" }, { status: 400 });
            }
            // path should be submissions/{assignmentId}/{studentId}/...
            const parts = f.storagePath.split("/");
            if (parts.length < 4 || parts[1] !== assignmentId) {
                return NextResponse.json({ success: false, message: "Path does not match assignment" }, { status: 400 });
            }
        }

        // One submission per student per assignment (replace existing)
        const existing = await prisma.submission.findFirst({
            where: { assignmentId, studentId: user.id },
            select: { id: true },
        });

        let submissionId = existing?.id;
        if (!submissionId) {
            const created = await prisma.submission.create({
                data: { assignmentId, studentId: user.id },
                select: { id: true },
            });
            submissionId = created.id;
        } else {
            // Clean previous files
            await prisma.submissionFile.deleteMany({ where: { submissionId } });
        }

        // Save files metadata
        if (files.length) {
            await prisma.submissionFile.createMany({
                data: files.map((f) => ({
                    submissionId: submissionId!,
                    fileName: f.fileName,
                    mimeType: f.mimeType || "application/octet-stream",
                    sizeBytes: f.sizeBytes,
                    storagePath: f.storagePath.replace("/public/", "/"),
                })),
            });
        }

        return NextResponse.json({ success: true, data: { submissionId } }, { status: 201 });
    } catch (error) {
        console.error("[ERROR] [POST] /api/submissions", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}


