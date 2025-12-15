import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { errorResponse, getAuthenticatedUser, isStudentInClassroom } from "@/lib/api-utils";

const paramsSchema = z
    .object({
        id: z.string().min(1).max(100),
    })
    .strict();

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const parsedParams = paramsSchema.safeParse(params);
        if (!parsedParams.success) {
            return errorResponse(400, "Dữ liệu không hợp lệ");
        }

        const user = await getAuthenticatedUser(req);
        if (!user) {
            return errorResponse(401, "Unauthorized");
        }

        const classroom = await prisma.classroom.findUnique({
            where: { id: parsedParams.data.id },
            include: {
                teacher: { select: { id: true, fullname: true, email: true } },
                _count: { select: { students: true } },
            },
        });

        if (!classroom) {
            return errorResponse(404, "Not found");
        }

        // Nếu là giáo viên: chỉ xem được lớp học của mình
        if (user.role === "TEACHER") {
            if (classroom.teacherId !== user.id) {
                return errorResponse(403, "Forbidden");
            }
        }
        // Nếu là học sinh: kiểm tra đã tham gia lớp chưa
        else if (user.role === "STUDENT") {
            const ok = await isStudentInClassroom(user.id, classroom.id);
            if (!ok) {
                return errorResponse(403, "Forbidden - Not a member");
            }
        }
        // Các role khác không được truy cập
        else {
            return errorResponse(403, "Forbidden");
        }

        return NextResponse.json(classroom);
    } catch (err) {
        console.error("GET /api/classrooms/[id] error", err);
        return errorResponse(500, "Internal server error");
    }
}


