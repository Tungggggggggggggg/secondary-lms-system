import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { errorResponse, getAuthenticatedUser } from "@/lib/api-utils";
import { notificationRepo } from "@/lib/repositories/notification-repo";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

const assignmentIdSchema = z.string().min(1).max(100);

const getQuerySchema = z
    .object({
        assignmentId: assignmentIdSchema,
    })
    .strict();

const postBodySchema = z
    .object({
        assignmentId: assignmentIdSchema,
        status: z.enum(["draft", "submitted"]).optional(),
        files: z
            .array(
                z
                    .object({
                        fileName: z.string().min(1).max(255),
                        mimeType: z.string().min(1).max(200).optional(),
                        sizeBytes: z.number().int().positive().max(MAX_FILE_SIZE),
                        storagePath: z.string().min(1).max(1024),
                    })
                    .strict(),
            )
            .min(1),
    })
    .strict();

const putBodySchema = z
    .object({
        assignmentId: assignmentIdSchema,
    })
    .strict();

// GET: lấy submission hiện tại (bao gồm file) của học sinh cho 1 assignment
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser(req);
        if (!user) return errorResponse(401, "Unauthorized");
        if (user.role !== "STUDENT") return errorResponse(403, "Forbidden");

        const url = new URL(req.url);
        const parsedQuery = getQuerySchema.safeParse({
            assignmentId: url.searchParams.get("assignmentId") ?? "",
        });
        if (!parsedQuery.success) {
            return errorResponse(400, "Dữ liệu không hợp lệ", {
                details: parsedQuery.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
            });
        }

        const { assignmentId } = parsedQuery.data;

        const submission = await prisma.submission.findFirst({
            where: { assignmentId, studentId: user.id },
            include: { files: true },
        });

        return NextResponse.json({ success: true, data: submission || null });
    } catch (error: unknown) {
        console.error("[ERROR] [GET] /api/submissions", error);
        return errorResponse(500, "Internal server error");
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser(req);
        if (!user) return errorResponse(401, "Unauthorized");
        if (user.role !== "STUDENT") return errorResponse(403, "Forbidden");

        const rawBody: unknown = await req.json().catch(() => null);
        const parsedBody = postBodySchema.safeParse(rawBody);
        if (!parsedBody.success) {
            return errorResponse(400, "Dữ liệu không hợp lệ", {
                details: parsedBody.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
            });
        }

        const { assignmentId, files, status } = parsedBody.data;

        // Validate files
        for (const f of files) {
            if (!f.storagePath.startsWith("submissions/")) {
                return errorResponse(400, "Invalid storage path");
            }
            if (f.storagePath.includes("..") || f.storagePath.includes("\\")) {
                return errorResponse(400, "Invalid storage path");
            }
            // path should be submissions/{assignmentId}/{studentId}/...
            const parts = f.storagePath.split("/");
            if (parts.length < 4 || parts[1] !== assignmentId || parts[2] !== user.id) {
                return errorResponse(400, "Path does not match assignment");
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
    } catch (error: unknown) {
        console.error("[ERROR] [POST] /api/submissions", error);
        return errorResponse(500, "Internal server error");
    }
}

// PUT: xác nhận nộp bài (chuyển từ draft -> submitted)
export async function PUT(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser(req);
        if (!user) return errorResponse(401, "Unauthorized");
        if (user.role !== "STUDENT") return errorResponse(403, "Forbidden");

        const rawBody: unknown = await req.json().catch(() => null);
        const parsedBody = putBodySchema.safeParse(rawBody);
        if (!parsedBody.success) {
            return errorResponse(400, "Dữ liệu không hợp lệ", {
                details: parsedBody.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
            });
        }

        const { assignmentId } = parsedBody.data;

        const submission = await prisma.submission.findFirst({
            where: { assignmentId, studentId: user.id },
            select: { id: true, status: true },
        });
        if (!submission) {
            return errorResponse(404, "Submission not found");
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
                return errorResponse(403, "Bạn đã nộp bài. Không thể nộp thêm lần nữa.");
            }
        } else {
            // Nếu cho nhiều lần, dùng số lượng assignment_submissions đã có để ước lượng attempts đã dùng
            const usedAttempts = await prisma.assignmentSubmission.count({
                where: { assignmentId, studentId: user.id },
            });
            if (usedAttempts >= maxAttempts) {
                return errorResponse(
                    403,
                    `Bạn đã sử dụng hết số lần nộp (${maxAttempts}). Không thể nộp thêm lần nữa.`
                );
            }
        }

        await prisma.submission.update({ where: { id: submission.id }, data: { status: "submitted" } });

        try {
            const teacherRow = await prisma.assignmentClassroom.findFirst({
                where: {
                    assignmentId,
                    classroom: {
                        students: {
                            some: { studentId: user.id },
                        },
                    },
                },
                select: {
                    classroomId: true,
                    classroom: { select: { teacherId: true } },
                },
            });

            const teacherId = teacherRow?.classroom?.teacherId;
            if (teacherId) {
                const assignmentRow = await prisma.assignment.findUnique({
                    where: { id: assignmentId },
                    select: { id: true, title: true },
                });

                await notificationRepo.add(teacherId, {
                    type: "TEACHER_SUBMISSION_NEED_GRADING",
                    title: `Cần chấm bài (file): ${assignmentRow?.title || "Bài tập"}`,
                    description: "Có học sinh vừa nộp bài dạng file.",
                    actionUrl: `/dashboard/teacher/assignments/${assignmentId}/submissions`,
                    dedupeKey: `fileSubmit:${assignmentId}:${user.id}:${submission.id}`,
                    meta: { assignmentId, studentId: user.id, submissionId: submission.id, classroomId: teacherRow?.classroomId },
                });
            }
        } catch {}

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("[ERROR] [PUT] /api/submissions", error);
        return errorResponse(500, "Internal server error");
    }
}
