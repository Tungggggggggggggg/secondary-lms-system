import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/api-utils";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "lms-submissions";
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

interface IncomingFileMeta {
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    storagePath: string;
}

// GET: lấy submission hiện tại (bao gồm file) của học sinh cho 1 assignment
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser(req, "STUDENT");
        if (!user) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const url = new URL(req.url);
        const assignmentId = url.searchParams.get("assignmentId");
        if (!assignmentId) {
            return NextResponse.json({ success: false, message: "assignmentId is required" }, { status: 400 });
        }

        const submission = await prisma.submission.findFirst({
            where: { assignmentId, studentId: user.id },
            include: { files: true },
        });

        return NextResponse.json({ success: true, data: submission || null });
    } catch (error) {
        console.error("[ERROR] [GET] /api/submissions", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser(req, "STUDENT");
        if (!user) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { assignmentId, files, status } = body as { assignmentId?: string; files?: IncomingFileMeta[]; status?: "draft" | "submitted" };
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
                data: { assignmentId, studentId: user.id, status: status === "submitted" ? "submitted" : "draft" },
                select: { id: true },
            });
            submissionId = created.id;
        } else {
            // Clean previous files
            await prisma.submissionFile.deleteMany({ where: { submissionId } });
            // update status if provided
            if (status === "submitted" || status === "draft") {
                await prisma.submission.update({ where: { id: submissionId }, data: { status } });
            }
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

// PUT: xác nhận nộp bài (chuyển từ draft -> submitted)
export async function PUT(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser(req, "STUDENT");
        if (!user) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { assignmentId } = body as { assignmentId?: string };
        if (!assignmentId) {
            return NextResponse.json({ success: false, message: "assignmentId is required" }, { status: 400 });
        }

        const submission = await prisma.submission.findFirst({
            where: { assignmentId, studentId: user.id },
            select: { id: true, status: true },
        });
        if (!submission) {
            return NextResponse.json({ success: false, message: "Submission not found" }, { status: 404 });
        }

        // Enforce max_attempts (ưu tiên áp dụng cho QUIZ, nhưng với file-based ta chặn nếu đã submitted khi max_attempts=1)
        const assignment = await prisma.assignment.findUnique({
            where: { id: assignmentId },
            select: { id: true, type: true, max_attempts: true },
        });
        const maxAttempts = assignment?.max_attempts ?? 1;

        if (maxAttempts <= 1) {
            // Nếu chỉ cho 1 lần nộp, mà đã submitted rồi -> chặn
            if (submission.status === "submitted") {
                return NextResponse.json(
                    { success: false, message: "Bạn đã nộp bài. Không thể nộp thêm lần nữa." },
                    { status: 403 }
                );
            }
        } else {
            // Nếu cho nhiều lần, dùng số lượng assignment_submissions đã có để ước lượng attempts đã dùng
            const usedAttempts = await prisma.assignmentSubmission.count({
                where: { assignmentId, studentId: user.id },
            });
            if (usedAttempts >= maxAttempts) {
                return NextResponse.json(
                    {
                        success: false,
                        message: `Bạn đã sử dụng hết số lần nộp (${maxAttempts}). Không thể nộp thêm lần nữa.`,
                    },
                    { status: 403 }
                );
            }
        }

        await prisma.submission.update({ where: { id: submission.id }, data: { status: "submitted" } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[ERROR] [PUT] /api/submissions", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
