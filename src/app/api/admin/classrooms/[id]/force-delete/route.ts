import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { auditRepo } from "@/lib/repositories/audit-repo";
import { errorResponse } from "@/lib/api-utils";

const requestSchema = z.object({
  reason: z.string().min(1).max(500),
  confirm: z.string().min(1).max(20),
});

/**
 * Force delete một lớp học (Admin-only).
 * Yêu cầu lớp đã được lưu trữ và admin xác nhận bằng mã lớp + nhập reason.
 */
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

    const reason = parsed.data.reason.trim();
    if (!reason) {
      return errorResponse(400, "Vui lòng nhập lý do");
    }

    const target = await prisma.classroom.findUnique({
      where: { id: classroomId },
      select: {
        id: true,
        name: true,
        code: true,
        isActive: true,
        organizationId: true,
        teacherId: true,
        _count: {
          select: {
            students: true,
            courses: true,
            assignments: true,
            announcements: true,
            conversations: true,
          },
        },
      },
    });

    if (!target) {
      return errorResponse(404, "Classroom not found");
    }

    if (target.isActive) {
      return errorResponse(409, "Chỉ có thể force delete lớp đã lưu trữ.");
    }

    const confirm = parsed.data.confirm.trim().toUpperCase();
    if (!confirm || confirm !== target.code.toUpperCase()) {
      return errorResponse(400, "Mã xác nhận không khớp. Vui lòng nhập đúng mã lớp.");
    }

    const deleted = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const conversationsDeleted = await tx.conversation.deleteMany({
        where: { classId: classroomId },
      });

      await tx.classroom.delete({ where: { id: classroomId } });

      return {
        conversationsDeleted: conversationsDeleted.count,
      };
    });

    try {
      await auditRepo.write({
        actorId: session.user.id,
        actorRole: "ADMIN",
        action: "CLASSROOM_FORCE_DELETE",
        entityType: "CLASSROOM",
        entityId: classroomId,
        organizationId: target.organizationId || null,
        metadata: {
          reason,
          classroomCode: target.code,
          classroomName: target.name,
          teacherId: target.teacherId,
          countsBeforeDelete: {
            students: target._count.students,
            courses: target._count.courses,
            assignments: target._count.assignments,
            announcements: target._count.announcements,
            conversations: target._count.conversations,
          },
          deleted: {
            conversations: deleted.conversationsDeleted,
          },
        },
      });
    } catch {}

    return NextResponse.json(
      {
        success: true,
        data: {
          id: classroomId,
          deletedConversations: deleted.conversationsDeleted,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[API /api/admin/classrooms/[id]/force-delete] Error", error);
    return errorResponse(500, "Internal server error");
  }
}
