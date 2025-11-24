import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, withApiLogging, errorResponse } from "@/lib/api-utils";
import { writeAudit } from "@/lib/logging/audit";

// PUT /api/admin/system/users/[id]/2fa
// body: { enabled: boolean }
// Placeholder: lưu danh sách bật 2FA trong SystemSetting key: "twofa_users" (mảng userId)
export const PUT = withApiLogging(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const authUser = await getAuthenticatedUser(req);
  if (!authUser) return errorResponse(401, "Unauthorized");
  if (authUser.role !== "SUPER_ADMIN") return errorResponse(403, "Forbidden: SUPER_ADMIN only");

  const userId = params.id;
  if (!userId) return errorResponse(400, "Missing user id");

  let body: { enabled?: boolean } = {};
  try { body = await req.json(); } catch { return errorResponse(400, "Invalid JSON body"); }
  const enabled = !!body.enabled;

  // ensure user exists
  const exists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!exists) return errorResponse(404, "User not found");

  // read current twofa users list
  const row = await prisma.systemSetting.findUnique({ where: { key: "twofa_users" } });
  const current: string[] = Array.isArray(row?.value) ? (row!.value as any) : [];
  const set = new Set<string>(current);
  if (enabled) set.add(userId); else set.delete(userId);
  const updated = Array.from(set);

  await prisma.systemSetting.upsert({
    where: { key: "twofa_users" },
    update: { value: updated as any },
    create: { key: "twofa_users", value: updated as any },
  });

  await writeAudit({
    actorId: authUser.id,
    action: enabled ? "USER_2FA_ENABLE" : "USER_2FA_DISABLE",
    entityType: "USER",
    entityId: userId,
  });

  return NextResponse.json({ success: true, userId, enabled });
}, "ADMIN_SYSTEM_USER_2FA_TOGGLE");
