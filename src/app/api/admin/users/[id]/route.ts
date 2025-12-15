import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { settingsRepo } from "@/lib/repositories/settings-repo";
import { errorResponse } from "@/lib/api-utils";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

const paramsSchema = z.object({
  id: z.string().min(1),
});

/**
 * GET /api/admin/users/[id]
 *
 * Input:
 * - params.id: string
 *
 * Output:
 * - success true + user detail (kèm disabled state, org memberships, audit logs)
 *
 * Side effects:
 * - Read DB
 */
export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return errorResponse(403, "Forbidden - Admins only");
    }

    const parsedParams = paramsSchema.safeParse(ctx?.params);
    if (!parsedParams.success) {
      return errorResponse(400, "Missing user id");
    }

    const userId = parsedParams.data.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullname: true,
        role: true,
        roleSelectedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return errorResponse(404, "User not found");
    }

    const disabledSetting = await settingsRepo.get("disabled_users");
    let isDisabled = false;
    let disabledReason: string | null = null;

    if (Array.isArray(disabledSetting)) {
      for (const item of disabledSetting) {
        if (typeof item === "string" && item === userId) {
          isDisabled = true;
          break;
        }

        if (!isRecord(item)) continue;
        if (typeof item.id !== "string" || item.id !== userId) continue;

        isDisabled = true;
        disabledReason = typeof item.reason === "string" ? item.reason : null;
        break;
      }
    }

    const memberships = await prisma.organizationMember.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        roleInOrg: true,
        createdAt: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            createdAt: true,
          },
        },
      },
      take: 200,
    });

    const globalRole = String(user.role);

    const [teacherClassrooms, studentEnrollments, parentRelations] = await Promise.all([
      globalRole === "TEACHER" ? prisma.classroom.count({ where: { teacherId: userId } }) : Promise.resolve(0),
      globalRole === "STUDENT" ? prisma.classroomStudent.count({ where: { studentId: userId } }) : Promise.resolve(0),
      globalRole === "PARENT" ? prisma.parentStudent.count({ where: { parentId: userId } }) : Promise.resolve(0),
    ]);

    const auditLogs = await prisma.auditLog.findMany({
      where: {
        OR: [{ actorId: userId }, { entityType: "USER", entityId: userId }],
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        actorId: true,
        actorRole: true,
        organizationId: true,
        createdAt: true,
        ip: true,
        userAgent: true,
        metadata: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        user: {
          ...user,
          isDisabled,
          disabledReason,
          stats: {
            teacherClassrooms,
            studentEnrollments,
            parentRelations,
          },
        },
        memberships,
        auditLogs,
      },
    });
  } catch (error) {
    console.error("[API /api/admin/users/[id] GET] Error", error);
    return errorResponse(500, "Internal server error");
  }
}
