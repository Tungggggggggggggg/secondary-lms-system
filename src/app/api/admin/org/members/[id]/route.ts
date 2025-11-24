import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, withApiLogging, errorResponse } from "@/lib/api-utils";
import { writeAudit } from "@/lib/logging/audit";
import { invalidateMembershipCache } from "@/lib/rbac/policy";
import { isStaffRole, isSuperAdminRole } from "@/lib/rbac/policy";

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

    if (!isStaffRole(authUser.role) && !isSuperAdminRole(authUser.role)) {
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
        roleInOrg: true,
      },
    });

    if (!member) {
      return errorResponse(404, "Member not found");
    }

    // Không cho xoá OWNER trực tiếp (phải qua transfer flow)
    if (member.roleInOrg === "OWNER") {
      return errorResponse(409, "Cannot remove OWNER directly. Use transfer ownership flow.");
    }

    // Nếu là STAFF (ADMIN), phải là member của organization đó
    if (isStaffRole(authUser.role)) {
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
    try { invalidateMembershipCache(member.userId, member.organizationId); } catch {}

    try {
      await writeAudit({
        actorId: authUser.id,
        action: "ORG_MEMBER_REMOVE",
        entityType: "ORGANIZATION",
        entityId: member.organizationId,
        metadata: { memberId, userId: member.userId },
      });
    } catch (e) {
      console.error("[ADMIN_ORG_MEMBERS_DELETE] Failed to write audit", e);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[DELETE /api/admin/org/members/[id]] Error:", error);
    if (error?.code === "P2025") {
      return errorResponse(404, "Member not found");
    }
    return errorResponse(500, error?.message || "Internal server error");
  }
}, "ADMIN_ORG_MEMBERS_DELETE");


/**
 * PATCH /api/admin/org/members/[id]
 * Cập nhật vai trò trong tổ chức (roleInOrg)
 */
export const PATCH = withApiLogging(async (req: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return errorResponse(401, "Unauthorized");
    }

    if (!isStaffRole(authUser.role) && !isSuperAdminRole(authUser.role)) {
      return errorResponse(403, "Forbidden: ADMIN/SUPER_ADMIN only");
    }

    const memberId = params.id;

    // Body parse
    let body: { roleInOrg?: string | null } = {};
    try {
      body = await req.json();
    } catch {
      return errorResponse(400, "Invalid JSON body");
    }

    const allowedOrgRoles = ["ADMIN", "TEACHER", "STUDENT", "PARENT", "OWNER"] as const;
    const newRole = body.roleInOrg === null || body.roleInOrg === undefined ? null : body.roleInOrg;
    if (newRole && !allowedOrgRoles.includes(newRole as any)) {
      return errorResponse(400, "Invalid roleInOrg value");
    }
    if (newRole === "OWNER") {
      return errorResponse(409, "Cannot set OWNER via this endpoint. Use transfer ownership flow.");
    }

    // Lấy thông tin member để check quyền
    const member = await prisma.organizationMember.findUnique({
      where: { id: memberId },
      select: { id: true, organizationId: true, userId: true, roleInOrg: true },
    });
    if (!member) return errorResponse(404, "Member not found");

    // Không cho hạ cấp OWNER
    if (member.roleInOrg === "OWNER" && newRole !== "OWNER") {
      return errorResponse(409, "Cannot demote OWNER. Use transfer ownership flow.");
    }

    // Nếu là STAFF (ADMIN), phải là member của organization đó
    if (isStaffRole(authUser.role)) {
      const isAdminMember = await prisma.organizationMember.findFirst({
        where: { organizationId: member.organizationId, userId: authUser.id },
        select: { id: true },
      });
      if (!isAdminMember) return errorResponse(403, "Forbidden: not a member of organization");
    }

    const updated = await prisma.organizationMember.update({
      where: { id: memberId },
      data: { roleInOrg: newRole as any },
      select: { id: true, roleInOrg: true },
    });
    try { invalidateMembershipCache(member.userId, member.organizationId); } catch {}

    try {
      await writeAudit({
        actorId: authUser.id,
        action: "ORG_MEMBER_ROLE_UPDATE",
        entityType: "ORGANIZATION",
        entityId: member.organizationId,
        metadata: { memberId, previousRole: member.roleInOrg, newRole: updated.roleInOrg },
      });
    } catch (e) {
      console.error("[ADMIN_ORG_MEMBERS_PATCH] Failed to write audit", e);
    }

    return NextResponse.json({ success: true, id: updated.id, roleInOrg: updated.roleInOrg });
  } catch (error: any) {
    console.error("[PATCH /api/admin/org/members/[id]] Error:", error);
    return errorResponse(500, error?.message || "Internal server error");
  }
}, "ADMIN_ORG_MEMBERS_UPDATE");

