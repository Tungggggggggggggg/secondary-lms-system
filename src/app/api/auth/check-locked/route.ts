import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { settingsRepo } from "@/lib/repositories/settings-repo";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const email = (body?.email || "").toString().trim();

    if (!email) {
      return errorResponse(400, "Missing email");
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ success: true, locked: false, reason: null });
    }

    const disabledSetting = await settingsRepo.get("disabled_users");
    let locked = false;
    let reason: string | null = null;

    if (Array.isArray(disabledSetting)) {
      for (const item of disabledSetting) {
        if (typeof item === "string" && item === user.id) {
          locked = true;
          break;
        }

        if (!isRecord(item)) continue;
        if (typeof item.id !== "string" || item.id !== user.id) continue;

        locked = true;
        reason = typeof item.reason === "string" ? item.reason : null;
        break;
      }
    }

    return NextResponse.json({ success: true, locked, reason });
  } catch (error) {
    console.error("[API /api/auth/check-locked] Error", error);
    return errorResponse(500, "Internal server error");
  }
}
