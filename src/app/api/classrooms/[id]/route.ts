import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Only allow teacher to access their classroom (can widen later)
        if (session.user?.role !== "TEACHER") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const classroom = await prisma.classroom.findUnique({
            where: { id: params.id },
            include: {
                teacher: true,
                _count: { select: { students: true } },
            },
        });

        if (!classroom) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        if (classroom.teacherId !== session.user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        return NextResponse.json(classroom);
    } catch (err) {
        console.error("GET /api/classrooms/[id] error", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}


