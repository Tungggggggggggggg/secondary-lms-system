import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { auditRepo } from "@/lib/repositories/audit-repo";
import { errorResponse } from "@/lib/api-utils";

const requestSchema = z.object({
  teacherId: z.string().min(1),
  reason: z.string().max(500).optional(),
});

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
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
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ", {
        details: parsed.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const teacherId = parsed.data.teacherId;
    const reason = parsed.data.reason?.trim() || null;

    const [classroom, teacher] = await Promise.all([
      prisma.classroom.findUnique({
        where: { id: classroomId },
        select: { id: true, name: true, code: true, teacherId: true, organizationId: true, isActive: true },
      }),
      prisma.user.findUnique({
        where: { id: teacherId },
        select: { id: true, role: true, email: true, fullname: true },
      }),
    ]);

    if (!classroom) {
      return errorResponse(404, "Classroom not found");
    }

    if (!classroom.isActive) {
      return errorResponse(409, "Lớp đã được lưu trữ. Vui lòng khôi phục để thao tác.");
    }

    if (!teacher || String(teacher.role) !== "TEACHER") {
      return errorResponse(400, "Teacher không hợp lệ");
    }

    const prevTeacherId = classroom.teacherId;

    const updated = await prisma.classroom.update({
      where: { id: classroomId },
      data: { teacherId },
      select: { id: true, teacherId: true },
    });

    try {
      await auditRepo.write({
        actorId: session.user.id,
        actorRole: "ADMIN",
        action: "CLASSROOM_CHANGE_TEACHER",
        entityType: "CLASSROOM",
        entityId: classroomId,
        organizationId: classroom.organizationId || null,
        metadata: {
          reason,
          classroomCode: classroom.code,
          classroomName: classroom.name,
          prevTeacherId,
          nextTeacherId: teacherId,
          nextTeacherEmail: teacher.email,
        },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        teacherId: updated.teacherId,
      },
    });
  } catch (error) {
    console.error("[API /api/admin/classrooms/[id]/teacher] Error", error);
    return errorResponse(500, "Internal server error");
  }
}
