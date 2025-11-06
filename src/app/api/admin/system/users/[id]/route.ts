import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, withApiLogging, errorResponse } from "@/lib/api-utils";
import { writeAudit } from "@/lib/logging/audit";

// DELETE /api/admin/system/users/[id]
export const DELETE = withApiLogging(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const authUser = await getAuthenticatedUser(req);
  if (!authUser) return errorResponse(401, "Unauthorized");
  if (authUser.role !== "SUPER_ADMIN") return errorResponse(403, "Forbidden: SUPER_ADMIN only");

  const userId = params.id;
  if (authUser.id === userId) return errorResponse(400, "Cannot delete yourself");

  try {
    // Không xóa cứng các dữ liệu tham chiếu khác ở đây (đang cascade ở schema một số nơi)
    await prisma.user.delete({ where: { id: userId } });
    await writeAudit({ actorId: authUser.id, action: "USER_DELETE", entityType: "USER", entityId: userId });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e?.code === "P2025") return errorResponse(404, "User not found");
    throw e;
  }
}, "ADMIN_SYSTEM_USERS_DELETE");


