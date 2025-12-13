import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api-utils";
import { auditRepo } from "@/lib/repositories/audit-repo";

export async function DELETE(req: NextRequest, ctx: { params: { id: string; studentId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return errorResponse(403, "Forbidden - Admins only");
    }

    const classroomId = ctx?.params?.id;
    const studentId = ctx?.params?.studentId;
    if (!classroomId || !studentId) {
      return errorResponse(400, "Missing classroom id or student id");
    }

    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
      select: { id: true, name: true, code: true, organizationId: true, isActive: true },
    });

    if (!classroom) {
      return errorResponse(404, "Classroom not found");
    }

    if (!classroom.isActive) {
      return errorResponse(409, "Lớp đã được lưu trữ. Vui lòng khôi phục để thao tác.");
    }

    const link = await prisma.classroomStudent.findUnique({
      where: { classroomId_studentId: { classroomId, studentId } },
      select: { studentId: true, student: { select: { email: true, fullname: true } } },
    });

    if (!link) {
      return NextResponse.json({ success: true, data: { removed: false } }, { status: 200 });
    }

    await prisma.classroomStudent.delete({
      where: { classroomId_studentId: { classroomId, studentId } },
    });

    try {
      await auditRepo.write({
        actorId: session.user.id,
        actorRole: "ADMIN",
        action: "CLASSROOM_REMOVE_STUDENT",
        entityType: "CLASSROOM",
        entityId: classroomId,
        organizationId: classroom.organizationId || null,
        metadata: {
          classroomCode: classroom.code,
          classroomName: classroom.name,
          studentId,
          studentEmail: link.student.email,
          studentName: link.student.fullname,
        },
      });
    } catch {}

    return NextResponse.json({ success: true, data: { removed: true } }, { status: 200 });
  } catch (error) {
    console.error("[API /api/admin/classrooms/[id]/students/[studentId] DELETE] Error", error);
    return errorResponse(500, "Internal server error");
  }
}
