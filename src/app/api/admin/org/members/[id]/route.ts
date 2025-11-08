import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, withApiLogging, errorResponse } from "@/lib/api-utils";

/**
 * DELETE /api/admin/org/members/[id]
 * Xóa thành viên khỏi tổ chức
 */
export const DELETE = withApiLogging(async (req: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return errorResponse(401, "Unauthorized");
    }

    if (authUser.role !== "ADMIN" && authUser.role !== "SUPER_ADMIN") {
      return errorResponse(403, "Forbidden: ADMIN/SUPER_ADMIN only");
    }

    const memberId = params.id;

    // Lấy thông tin member để check quyền
    const member = await prisma.organizationMember.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        organizationId: true,
        userId: true,
      },
    });

    if (!member) {
      return errorResponse(404, "Member not found");
    }

    // Nếu là ADMIN, phải là member của organization đó
    if (authUser.role === "ADMIN") {
      const isAdminMember = await prisma.organizationMember.findFirst({
        where: {
          organizationId: member.organizationId,
          userId: authUser.id,
        },
        select: { id: true },
      });

      if (!isAdminMember) {
        return errorResponse(403, "Forbidden: not a member of organization");
      }
    }

    // Xóa member
    await prisma.organizationMember.delete({
      where: { id: memberId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[DELETE /api/admin/org/members/[id]] Error:", error);
    if (error?.code === "P2025") {
      return errorResponse(404, "Member not found");
    }
    return errorResponse(500, error?.message || "Internal server error");
  }
}, "ADMIN_ORG_MEMBERS_DELETE");

