import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { settingsRepo } from "@/lib/repositories/settings-repo";
import { prisma } from "@/lib/prisma";
import { auditRepo } from "@/lib/repositories/audit-repo";

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Forbidden - Admins only" },
        { status: 403 }
      );
    }

    const userId = ctx.params.id;
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Missing user id" },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => null);
    const action = (body?.action || "").toString().toUpperCase();
    const reason = (body?.reason || "").toString().trim() || undefined;

    if (!["BAN", "UNBAN"].includes(action)) {
      return NextResponse.json(
        { success: false, message: "Invalid action. Must be BAN or UNBAN" },
        { status: 400 }
      );
    }

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true },
    });

    if (!target) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    if (action === "BAN" && String(target.role) === "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Không thể ban tài khoản ADMIN" },
        { status: 400 }
      );
    }

    const current = await settingsRepo.get("disabled_users");
    const entries: { id: string; reason: string | null }[] = [];

    if (Array.isArray(current)) {
      for (const item of current as any[]) {
        if (typeof item === "string") {
          entries.push({ id: item, reason: null });
        } else if (item && typeof item === "object" && typeof (item as any).id === "string") {
          const it = item as any;
          entries.push({ id: it.id, reason: typeof it.reason === "string" ? it.reason : null });
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
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}
