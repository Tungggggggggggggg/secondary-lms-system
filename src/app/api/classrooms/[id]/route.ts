import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser, isStudentInClassroom } from "@/lib/api-utils";

export async function GET(req: Request, { params }: { params: { id: string } }) {
    try {
        const user = await getAuthenticatedUser(req as any);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const classroom = await prisma.classroom.findUnique({
            where: { id: params.id },
            include: {
                teacher: { select: { id: true, fullname: true, email: true } },
                _count: { select: { students: true } },
            },
        });

        if (!classroom) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        // Nếu là giáo viên: chỉ xem được lớp học của mình
        if (user.role === "TEACHER") {
            if (classroom.teacherId !== user.id) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
        }
        // Nếu là học sinh: kiểm tra đã tham gia lớp chưa
        else if (user.role === "STUDENT") {
            const ok = await isStudentInClassroom(user.id, classroom.id);
            if (!ok) {
                return NextResponse.json({ error: "Forbidden - Not a member" }, { status: 403 });
            }
        }
        // Các role khác không được truy cập
        else {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        return NextResponse.json(classroom);
    } catch (err) {
        console.error("GET /api/classrooms/[id] error", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}


