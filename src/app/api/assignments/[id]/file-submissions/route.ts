import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, getAuthenticatedUser, isTeacherOfAssignment } from "@/lib/api-utils";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const user = await getAuthenticatedUser(req);
        if (!user) return errorResponse(401, "Unauthorized");
        if (user.role !== "TEACHER") return errorResponse(403, "Forbidden");

        const assignmentId = params.id;
        if (!assignmentId) return errorResponse(400, "Missing assignmentId");

        const isOwner = await isTeacherOfAssignment(user.id, assignmentId);
        if (!isOwner) return errorResponse(403, "Forbidden");

        const submissions = (await prisma.submission.findMany({
            where: { assignmentId },
            select: {
                id: true,
                createdAt: true,
                studentId: true,
                files: { select: { id: true } },
            },
            orderBy: { createdAt: "desc" },
        })) as Array<{ id: string; createdAt: Date; studentId: string; files: Array<{ id: string }> }>;

        const studentIds = Array.from(new Set(submissions.map((s) => s.studentId)));
        const students: Array<{ id: string; fullname: string | null; email: string }> = studentIds.length
          ? ((await prisma.user.findMany({
              where: { id: { in: studentIds } },
              select: { id: true, fullname: true, email: true },
            })) as Array<{ id: string; fullname: string | null; email: string }>)
          : [];
        const studentMap = new Map<string, { id: string; fullname: string | null; email: string }>(
          students.map((s) => [s.id, s])
        );

        const data = submissions.map((s) => ({
            id: s.id,
            submittedAt: s.createdAt,
            student: studentMap.get(s.studentId) ?? { id: s.studentId, fullname: null, email: "" },
            filesCount: s.files.length,
        }));
        return NextResponse.json({ success: true, data }, { status: 200 });
    } catch (error: unknown) {
        console.error("[ERROR] [GET] /api/assignments/[id]/file-submissions", error);
        return errorResponse(500, "Internal server error");
    }
}


