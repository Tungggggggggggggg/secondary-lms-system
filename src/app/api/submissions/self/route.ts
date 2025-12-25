import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, getAuthenticatedUser } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

const querySchema = z
    .object({
        assignmentId: z.string().min(1).max(100),
    })
    .strict();

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser(req);
        if (!user) return errorResponse(401, "Unauthorized");
        if (user.role !== "STUDENT") return errorResponse(403, "Forbidden");
        const url = new URL(req.url);
        const parsedQuery = querySchema.safeParse({
            assignmentId: url.searchParams.get("assignmentId") ?? "",
        });
        if (!parsedQuery.success) {
            return errorResponse(400, "Dữ liệu không hợp lệ", {
                details: parsedQuery.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
            });
        }

        const { assignmentId } = parsedQuery.data;
        const sub = await prisma.submission.findFirst({
            where: { assignmentId, studentId: user.id },
            select: { id: true, createdAt: true, files: { select: { id: true } } },
        });
        return NextResponse.json({ success: true, data: sub ? { submissionId: sub.id, filesCount: sub.files.length, submittedAt: sub.createdAt } : null }, { status: 200 });
    } catch (error: unknown) {
        console.error("[ERROR] [GET] /api/submissions/self", error);
        return errorResponse(500, "Internal server error");
    }
}


