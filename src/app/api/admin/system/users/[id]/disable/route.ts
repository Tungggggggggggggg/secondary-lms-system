import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, withApiLogging, errorResponse } from "@/lib/api-utils";
import { writeAudit } from "@/lib/logging/audit";

// PUT /api/admin/system/users/[id]/disable
// body: { disabled: boolean }
// Lưu danh sách bị khoá trong SystemSetting key: "disabled_users" (mảng userId)
export const PUT = withApiLogging(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const authUser = await getAuthenticatedUser(req);
  if (!authUser) return errorResponse(401, "Unauthorized");
  if (authUser.role !== "SUPER_ADMIN") return errorResponse(403, "Forbidden: SUPER_ADMIN only");

  const userId = params.id;
  if (!userId) return errorResponse(400, "Missing user id");

  let body: { disabled?: boolean } = {};
  try { body = await req.json(); } catch { return errorResponse(400, "Invalid JSON body"); }
  const disabled = !!body.disabled;

  // ensure user exists
  const exists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!exists) return errorResponse(404, "User not found");

  // read current disabled users list
  const row = await prisma.systemSetting.findUnique({ where: { key: "disabled_users" } });
  const current: string[] = Array.isArray(row?.value) ? (row!.value as any) : [];
  const set = new Set<string>(current);
  if (disabled) set.add(userId); else set.delete(userId);
  const updated = Array.from(set);

  await prisma.systemSetting.upsert({
    where: { key: "disabled_users" },
    update: { value: updated as any },
    create: { key: "disabled_users", value: updated as any },
  });

  await writeAudit({
    actorId: authUser.id,
    action: disabled ? "USER_DISABLE" : "USER_ENABLE",
    entityType: "USER",
    entityId: userId,
  });

  return NextResponse.json({ success: true, userId, disabled });
}, "ADMIN_SYSTEM_USER_DISABLE_TOGGLE");
