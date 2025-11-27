import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser(req, "STUDENT");
        if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        const url = new URL(req.url);
        const assignmentId = url.searchParams.get("assignmentId");
        if (!assignmentId) return NextResponse.json({ success: false, message: "assignmentId is required" }, { status: 400 });
        const sub = await prisma.submission.findFirst({
            where: { assignmentId, studentId: user.id },
            select: { id: true, createdAt: true, files: { select: { id: true } } },
        });
        return NextResponse.json({ success: true, data: sub ? { submissionId: sub.id, filesCount: sub.files.length, submittedAt: sub.createdAt } : null }, { status: 200 });
    } catch (error) {
        console.error("[ERROR] [GET] /api/submissions/self", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}


