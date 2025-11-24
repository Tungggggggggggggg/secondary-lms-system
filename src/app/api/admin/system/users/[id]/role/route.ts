import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, withApiLogging, errorResponse } from "@/lib/api-utils";
import { writeAudit } from "@/lib/logging/audit";

// PATCH /api/admin/system/users/[id]/role
// body: { role: 'SUPER_ADMIN'|'STAFF'|'TEACHER'|'STUDENT'|'PARENT' }
export const PATCH = withApiLogging(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const authUser = await getAuthenticatedUser(req);
  if (!authUser) {
    return errorResponse(401, "Unauthorized");
  }
  if (authUser.role !== "SUPER_ADMIN") {
    return errorResponse(403, "Forbidden: SUPER_ADMIN only");
  }

  const userId = params.id;
  let body: { role?: string } = {};
  try {
    body = await req.json();
  } catch {
    return errorResponse(400, "Invalid JSON body");
  }

  const allowedRoles = ["SUPER_ADMIN", "STAFF", "TEACHER", "STUDENT", "PARENT"] as const;
  if (!body.role || !allowedRoles.includes(body.role as any)) {
    return errorResponse(400, "Invalid role value");
  }

  // Ngăn tự hạ cấp chính mình khỏi SUPER_ADMIN nếu là user duy nhất (an toàn tối thiểu)
  if (authUser.id === userId && body.role !== "SUPER_ADMIN") {
    const superAdminCount = await prisma.user.count({ where: { role: "SUPER_ADMIN" } });
    if (superAdminCount <= 1) {
      return errorResponse(400, "Cannot demote the last SUPER_ADMIN user");
    }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { role: body.role as any },
    select: { id: true, email: true, fullname: true, role: true },
  });

  // Audit log cho thay đổi vai trò
  try {
    await writeAudit({
      actorId: authUser.id,
      action: "USER_ROLE_CHANGE",
      entityType: "USER",
      entityId: userId,
      metadata: { newRole: updated.role },
    });
  } catch (e) {
    console.error("[ADMIN_SYSTEM_USERS_SET_ROLE] Failed to write audit", e);
  }

  return NextResponse.json({ success: true, user: updated });
}, "ADMIN_SYSTEM_USERS_SET_ROLE");


