import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, withApiLogging, errorResponse } from "@/lib/api-utils";
import bcrypt from "bcryptjs";
import { writeAudit } from "@/lib/logging/audit";

// POST /api/admin/system/users/[id]/password
// body: { newPassword: string }
export const POST = withApiLogging(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const authUser = await getAuthenticatedUser(req);
  if (!authUser) return errorResponse(401, "Unauthorized");
  if (authUser.role !== "SUPER_ADMIN") return errorResponse(403, "Forbidden: SUPER_ADMIN only");

  const userId = params.id;
  let body: { newPassword?: string } = {};
  try { body = await req.json(); } catch { return errorResponse(400, "Invalid JSON body"); }
  if (!body.newPassword || body.newPassword.length < 6) return errorResponse(400, "newPassword must be at least 6 chars");

  const hashed = await bcrypt.hash(body.newPassword, 10);
  try {
    await prisma.user.update({ where: { id: userId }, data: { password: hashed } });
    await writeAudit({ actorId: authUser.id, action: "USER_FORCE_PASSWORD_RESET", entityType: "USER", entityId: userId });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e?.code === "P2025") return errorResponse(404, "User not found");
    throw e;
  }
}, "ADMIN_SYSTEM_USERS_FORCE_PASSWORD_RESET");


