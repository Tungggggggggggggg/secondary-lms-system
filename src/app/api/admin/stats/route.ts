import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api-utils";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return errorResponse(403, "Forbidden - Admins only");
    }

    const [totalUsers, totalClassrooms, totalAssignments, totalOrganizations, roleGroups, disabledSetting] =
      await Promise.all([
        prisma.user.count(),
        prisma.classroom.count(),
        prisma.assignment.count(),
        prisma.organization.count(),
        prisma.user.groupBy({
          by: ["role"],
          _count: { role: true },
        }),
        prisma.systemSetting.findUnique({ where: { key: "disabled_users" } }),
      ]);

    const disabledIds = new Set<string>();
    const disabledRaw: unknown = disabledSetting?.value ?? null;
    if (Array.isArray(disabledRaw)) {
      for (const item of disabledRaw) {
        if (typeof item === "string") {
          disabledIds.add(item);
          continue;
        }
        if (isRecord(item) && typeof item.id === "string") {
          disabledIds.add(item.id);
        }
      }
    }

    const roleCounts: Record<string, number> = {
      TEACHER: 0,
      STUDENT: 0,
      PARENT: 0,
      ADMIN: 0,
    };
    for (const g of roleGroups) {
      roleCounts[g.role] = g._count.role;
    }

    const data = {
      totals: {
        users: totalUsers,
        classrooms: totalClassrooms,
        assignments: totalAssignments,
        organizations: totalOrganizations,
        disabledUsers: disabledIds.size,
      },
      byRole: roleCounts,
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[API /api/admin/stats] Error", error);
    return errorResponse(500, "Internal server error");
  }
}
