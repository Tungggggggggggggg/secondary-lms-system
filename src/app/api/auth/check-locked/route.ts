import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { settingsRepo } from "@/lib/repositories/settings-repo";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const email = (body?.email || "").toString().trim();

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Missing email" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ success: true, locked: false });
    }

    const disabledSetting = await settingsRepo.get("disabled_users");
    let locked = false;
    let reason: string | null = null;

    if (Array.isArray(disabledSetting)) {
      for (const item of disabledSetting as any[]) {
        if (typeof item === "string" && item === user.id) {
          locked = true;
          break;
        }
        if (
          item &&
          typeof item === "object" &&
          typeof (item as any).id === "string" &&
          (item as any).id === user.id
        ) {
          locked = true;
          reason = typeof (item as any).reason === "string" ? (item as any).reason : null;
          break;
        }
      }
    }

    return NextResponse.json({ success: true, locked, reason });
  } catch (error) {
    console.error("[API /api/auth/check-locked] Error", error);
    return NextResponse.json(
      { success: false, locked: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
