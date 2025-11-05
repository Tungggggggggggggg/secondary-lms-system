import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, isTeacherOfAssignment } from "@/lib/api-utils";
import { UserRole } from "@prisma/client";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const user = await getAuthenticatedUser(req, UserRole.TEACHER);
        if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

        const assignmentId = params.id;
        const isOwner = await isTeacherOfAssignment(user.id, assignmentId);
        if (!isOwner) return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

        const submissions = await prisma.submission.findMany({
            where: { assignmentId },
            select: {
                id: true,
                createdAt: true,
                student: { select: { id: true, fullname: true, email: true } } as any,
                files: { select: { id: true } },
            },
            orderBy: { createdAt: "desc" },
        } as any);

        const data = submissions.map((s: any) => ({
            id: s.id,
            submittedAt: s.createdAt,
            student: s.student,
            filesCount: s.files.length,
        }));
        return NextResponse.json({ success: true, data }, { status: 200 });
    } catch (error) {
        console.error("[ERROR] [GET] /api/assignments/[id]/file-submissions", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}


