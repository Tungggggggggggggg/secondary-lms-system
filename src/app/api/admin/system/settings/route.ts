import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, withApiLogging, errorResponse } from "@/lib/api-utils";
import { writeAudit } from "@/lib/logging/audit";

// GET /api/admin/system/settings
export const GET = withApiLogging(async (req: NextRequest) => {
  const authUser = await getAuthenticatedUser(req);
  if (!authUser) return errorResponse(401, "Unauthorized");
  if (authUser.role !== "SUPER_ADMIN") return errorResponse(403, "Forbidden: SUPER_ADMIN only");

  const rows = await prisma.systemSetting.findMany();
  const settings: Record<string, unknown> = {};

  interface SystemSettingRow {
    key: string;
    value: unknown;
  }

  rows.forEach((r: SystemSettingRow) => {
    (settings as any)[r.key] = r.value ?? null;
  });
  return NextResponse.json({ success: true, settings });
}, "ADMIN_SYSTEM_SETTINGS_GET");

// PUT /api/admin/system/settings
// body: { key: string, value: any }
export const PUT = withApiLogging(async (req: NextRequest) => {
  const authUser = await getAuthenticatedUser(req);
  if (!authUser) return errorResponse(401, "Unauthorized");
  if (authUser.role !== "SUPER_ADMIN") return errorResponse(403, "Forbidden: SUPER_ADMIN only");

  let body: { key?: string; value?: unknown } = {};
  try { body = await req.json(); } catch { return errorResponse(400, "Invalid JSON body"); }
  if (!body.key) return errorResponse(400, "key is required");

  const row = await prisma.systemSetting.upsert({
    where: { key: body.key },
    update: { value: body.value as any },
    create: { key: body.key, value: body.value as any },
  });
  try {
    await writeAudit({
      actorId: authUser.id,
      action: "SETTINGS_UPDATE",
      entityType: "SYSTEM",
      entityId: row.key,
      metadata: { key: row.key },
    });
  } catch (e) {
    console.error("[ADMIN_SYSTEM_SETTINGS_PUT] Failed to write audit", e);
  }
  return NextResponse.json({ success: true, key: row.key });
}, "ADMIN_SYSTEM_SETTINGS_PUT");


