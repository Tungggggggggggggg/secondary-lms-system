import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/prisma";
import { UserRole } from "@prisma/client";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user?.email! },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
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
        if (user.role === UserRole.TEACHER) {
            if (classroom.teacherId !== user.id) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
        }
        // Nếu là học sinh: kiểm tra đã tham gia lớp chưa
        else if (user.role === UserRole.STUDENT) {
            const isMember = await prisma.classroomStudent.findFirst({
                where: {
                    classroomId: classroom.id,
                    studentId: user.id,
                },
            });
            if (!isMember) {
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


