import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { settingsRepo } from "@/lib/repositories/settings-repo";
import { prisma } from "@/lib/prisma";
import { auditRepo } from "@/lib/repositories/audit-repo";
import { errorResponse } from "@/lib/api-utils";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return errorResponse(403, "Forbidden - Admins only");
    }

    const userId = ctx.params.id;
    if (!userId) {
      return errorResponse(400, "Missing user id");
    }

    const body = await req.json().catch(() => null);
    const action = (body?.action || "").toString().toUpperCase();
    const reason = (body?.reason || "").toString().trim() || undefined;

    if (!["BAN", "UNBAN"].includes(action)) {
      return errorResponse(400, "Invalid action. Must be BAN or UNBAN");
    }

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true },
    });

    if (!target) {
      return errorResponse(404, "User not found");
    }

    if (action === "BAN" && String(target.role) === "ADMIN") {
      return errorResponse(400, "Không thể ban tài khoản ADMIN");
    }

    const current = await settingsRepo.get("disabled_users");
    const entries: { id: string; reason: string | null }[] = [];

    if (Array.isArray(current)) {
      for (const item of current) {
        if (typeof item === "string") {
          entries.push({ id: item, reason: null });
          continue;
        }
        if (isRecord(item) && typeof item.id === "string") {
          const rawReason = item.reason;
          entries.push({
            id: item.id,
            reason: typeof rawReason === "string" ? rawReason : null,
          });
        }
      }
    }

    let nextEntries: { id: string; reason: string | null }[];
    let isDisabled: boolean;

    if (action === "BAN") {
      const cleanReason = reason ?? null;
      const idx = entries.findIndex((e) => e.id === userId);
      if (idx >= 0) {
        entries[idx] = { id: userId, reason: cleanReason };
      } else {
        entries.push({ id: userId, reason: cleanReason });
      }
      nextEntries = entries;
      isDisabled = true;
    } else {
      nextEntries = entries.filter((e) => e.id !== userId);
      isDisabled = false;
    }

    await settingsRepo.set("disabled_users", nextEntries);

    try {
      await auditRepo.write({
        actorId: session.user.id,
        actorRole: "ADMIN",
        action: action === "BAN" ? "USER_BAN" : "USER_UNBAN",
        entityType: "USER",
        entityId: userId,
        metadata: {
          reason: reason || null,
          targetEmail: target.email,
        },
      });
    } catch (e) {
      console.error("[API /api/admin/users/[id]/status] Failed to write audit", e);
    }

    return NextResponse.json({
      success: true,
      data: {
        id: userId,
        isDisabled,
      },
    });
  } catch (error) {
    console.error("[API /api/admin/users/[id]/status] Error", error);
    return errorResponse(500, "Internal server error");
  }
}
