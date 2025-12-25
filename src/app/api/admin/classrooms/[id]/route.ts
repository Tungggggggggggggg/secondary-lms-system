import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api-utils";
import { auditRepo } from "@/lib/repositories/audit-repo";

const updateSchema = z.object({
  name: z.string().min(1).max(200),
  code: z.string().min(4).max(20),
  maxStudents: z.number().int().min(1).max(500),
});

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return errorResponse(403, "Forbidden - Admins only");
    }

    const classroomId = ctx?.params?.id;
    if (!classroomId) {
      return errorResponse(400, "Missing classroom id");
    }

    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
      select: {
        id: true,
        name: true,
        code: true,
        icon: true,
        description: true,
        maxStudents: true,
        isActive: true,
        createdAt: true,
        teacher: { select: { id: true, fullname: true, email: true } },
        _count: { select: { students: true } },
      },
    });

    if (!classroom) {
      return errorResponse(404, "Classroom not found");
    }

    return NextResponse.json({ success: true, data: classroom }, { status: 200 });
  } catch (error) {
    console.error("[API /api/admin/classrooms/[id] GET] Error", error);
    return errorResponse(500, "Internal server error");
  }
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return errorResponse(403, "Forbidden - Admins only");
    }

    const classroomId = ctx?.params?.id;
    if (!classroomId) {
      return errorResponse(400, "Missing classroom id");
    }

    const body = await req.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ", {
        details: parsed.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const name = parsed.data.name.trim();
    const maxStudents = parsed.data.maxStudents;
    const code = parsed.data.code.trim().toUpperCase();

    const validPattern = /^[A-Z2-9]{4,10}$/;
    if (!validPattern.test(code)) {
      return errorResponse(400, "Mã lớp không hợp lệ");
    }

    const current = await prisma.classroom.findUnique({
      where: { id: classroomId },
      select: { id: true, name: true, code: true, maxStudents: true, organizationId: true, isActive: true },
    });

    if (!current) {
      return errorResponse(404, "Classroom not found");
    }

    if (!current.isActive) {
      return errorResponse(409, "Lớp đã được lưu trữ. Vui lòng khôi phục để thao tác.");
    }

    const exists = await prisma.classroom.findUnique({ where: { code } });
    if (exists && exists.id !== classroomId) {
      return errorResponse(409, "Mã lớp đã tồn tại, vui lòng chọn mã khác");
    }

    const updated = await prisma.classroom.update({
      where: { id: classroomId },
      data: { name, code, maxStudents },
      select: {
        id: true,
        name: true,
        code: true,
        icon: true,
        maxStudents: true,
        isActive: true,
        createdAt: true,
        teacher: { select: { id: true, fullname: true, email: true } },
        _count: { select: { students: true } },
      },
    });

    try {
      await auditRepo.write({
        actorId: session.user.id,
        actorRole: "ADMIN",
        action: "CLASSROOM_UPDATE",
        entityType: "CLASSROOM",
        entityId: classroomId,
        organizationId: current.organizationId || null,
        metadata: {
          before: { name: current.name, code: current.code, maxStudents: current.maxStudents },
          after: { name, code, maxStudents },
        },
      });
    } catch {}

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error) {
    console.error("[API /api/admin/classrooms/[id] PATCH] Error", error);
    return errorResponse(500, "Internal server error");
  }
}
