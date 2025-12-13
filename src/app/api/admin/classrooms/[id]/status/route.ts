import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { auditRepo } from "@/lib/repositories/audit-repo";
import { errorResponse } from "@/lib/api-utils";

const requestSchema = z.object({
  action: z.enum(["ARCHIVE", "UNARCHIVE"]),
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

    const action = parsed.data.action;
    const reason = parsed.data.reason?.trim() || null;

    const target = await prisma.classroom.findUnique({
      where: { id: classroomId },
      select: {
        id: true,
        name: true,
        code: true,
        isActive: true,
        teacherId: true,
        organizationId: true,
      },
    });

    if (!target) {
      return errorResponse(404, "Classroom not found");
    }

    const nextIsActive = action === "UNARCHIVE";

    const updated = await prisma.classroom.update({
      where: { id: classroomId },
      data: { isActive: nextIsActive },
      select: { id: true, isActive: true },
    });

    try {
      await auditRepo.write({
        actorId: session.user.id,
        actorRole: "ADMIN",
        action: action === "ARCHIVE" ? "CLASSROOM_ARCHIVE" : "CLASSROOM_UNARCHIVE",
        entityType: "CLASSROOM",
        entityId: classroomId,
        organizationId: target.organizationId || null,
        metadata: {
          reason,
          classroomCode: target.code,
          classroomName: target.name,
          previousIsActive: target.isActive,
          nextIsActive,
        },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        isActive: updated.isActive,
      },
    });
  } catch (error) {
    console.error("[API /api/admin/classrooms/[id]/status] Error", error);
    return errorResponse(500, "Internal server error");
  }
}
