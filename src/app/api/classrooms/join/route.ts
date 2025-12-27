import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { errorResponse, getAuthenticatedUser } from "@/lib/api-utils";

const bodySchema = z
  .object({
    code: z.string().max(50).optional(),
    classroomId: z.string().max(100).optional(),
  })
  .strict()
  .refine((v) => Boolean(v.code) !== Boolean(v.classroomId), {
    message: "Cần cung cấp code hoặc classroomId",
  });

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return errorResponse(401, "Unauthorized");
    }
    if (authUser.role !== "STUDENT") {
      return errorResponse(403, "Forbidden - STUDENT role required");
    }

    const rawBody: unknown = await req.json().catch(() => null);
    const parsedBody = bodySchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ", {
        details: parsedBody.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      });
    }

    const code = (parsedBody.data.code ?? "").trim().toUpperCase();
    const classroomId = (parsedBody.data.classroomId ?? "").trim();

    const selectClassroom: any = {
      id: true,
      name: true,
      description: true,
      icon: true,
      maxStudents: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      teacherId: true,
      teacher: { select: { id: true, fullname: true, email: true } },
      _count: { select: { students: true } },
    };

    const classroom: any = classroomId
      ? await prisma.classroom.findUnique({ where: { id: classroomId }, select: selectClassroom })
      : await prisma.classroom.findUnique({ where: { code }, select: selectClassroom });

    if (!classroom) {
      return errorResponse(404, "Không tìm thấy lớp học");
    }

    if (!classroom.isActive) {
      return errorResponse(400, "Không thể tham gia lớp học đã lưu trữ");
    }

    const existing = await prisma.classroomStudent.findUnique({
      where: {
        classroomId_studentId: {
          classroomId: classroom.id,
          studentId: authUser.id,
        },
      },
      select: { id: true },
    });

    if (existing) {
      return errorResponse(400, "Bạn đã là thành viên của lớp học này");
    }

    if (classroom._count.students >= classroom.maxStudents) {
      return errorResponse(400, "Lớp học đã đạt số lượng học sinh tối đa");
    }

    const classroomStudent: any = await prisma.classroomStudent.create({
      data: {
        classroomId: classroom.id,
        studentId: authUser.id,
      },
      select: {
        id: true,
        joinedAt: true,
        classroom: {
          select: selectClassroom,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Tham gia lớp học thành công",
      data: {
        ...classroomStudent,
        classroom: classroomStudent.classroom,
      },
    });
  } catch (error: unknown) {
    console.error("[CLASSROOM_JOIN]", error);
    return errorResponse(500, "Internal server error");
  }
}