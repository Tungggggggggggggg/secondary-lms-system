import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, withApiLogging, errorResponse } from "@/lib/api-utils";
import { writeAudit } from "@/lib/logging/audit";
import { invalidateMembershipCache } from "@/lib/rbac/policy";
import { parsePagination } from "@/lib/http/pagination";
import type { OrgRole } from "@prisma/client";
import { requireUserRead, requireUserWrite } from "@/lib/rbac/guards";

// GET /api/admin/org/members?orgId=xxx
export const GET = withApiLogging(async (req: NextRequest) => {
  const authUser = await getAuthenticatedUser(req);
  if (!authUser) return errorResponse(401, "Unauthorized");

  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgId");
  if (!orgId) return errorResponse(400, "Missing orgId");

  try {
    await requireUserRead({ id: authUser.id, role: authUser.role }, orgId);
  } catch {
    return errorResponse(403, "Forbidden: insufficient permissions");
  }


  const { skip, take } = parsePagination(searchParams, { defaultTake: 20, maxTake: 50 });
  const [members, total] = await Promise.all([
    prisma.organizationMember.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        roleInOrg: true,
        user: { select: { id: true, email: true, fullname: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.organizationMember.count({ where: { organizationId: orgId } })
  ]);

  return NextResponse.json({ success: true, items: members, total });
}, "ADMIN_ORG_MEMBERS_LIST");

// POST /api/admin/org/members
// body: { orgId, userId, roleInOrg? }
export const POST = withApiLogging(async (req: NextRequest) => {
  const authUser = await getAuthenticatedUser(req);
  if (!authUser) return errorResponse(401, "Unauthorized");

  let body: { orgId?: string; userId?: string; roleInOrg?: string } = {};
  try {
    body = await req.json();
  } catch {
    return errorResponse(400, "Invalid JSON body");
  }
  if (!body.orgId || !body.userId) {
    return errorResponse(400, "Missing orgId or userId");
  }

  const allowedOrgRoles = ["OWNER", "ADMIN", "TEACHER", "STUDENT", "PARENT"] as const;
  if (body.roleInOrg && !allowedOrgRoles.includes(body.roleInOrg as any)) {
    return errorResponse(400, "Invalid roleInOrg value");
  }

  // Ràng buộc: chỉ 1 OWNER duy nhất trong mỗi tổ chức
  if (body.roleInOrg === "OWNER") {
    const existingOwner = await prisma.organizationMember.findFirst({
      where: { organizationId: body.orgId, roleInOrg: "OWNER" as any },
      select: { id: true },
    });
    if (existingOwner) {
      return errorResponse(409, "Organization already has an OWNER. Use transfer ownership flow.");
    }
  }

  try {
    await requireUserWrite({ id: authUser.id, role: authUser.role }, body.orgId);
  } catch {
    return errorResponse(403, "Forbidden: insufficient permissions");
  }

  const created = await prisma.organizationMember.create({
    data: {
      organizationId: body.orgId,
      userId: body.userId,
      roleInOrg: body.roleInOrg ? (body.roleInOrg as OrgRole) : null,
    },
    select: { id: true },
  });
  // Xoá cache membership để đồng bộ ngay lập tức
  try { invalidateMembershipCache(body.userId, body.orgId); } catch {}
  try {
    await writeAudit({
      actorId: authUser.id,
      action: "ORG_MEMBER_ADD",
      entityType: "ORGANIZATION",
      entityId: body.orgId,
      metadata: { memberId: created.id, userId: body.userId, roleInOrg: body.roleInOrg ?? null },
    });
  } catch (e) {
    console.error("[ADMIN_ORG_MEMBERS_CREATE] Failed to write audit", e);
  }

  return NextResponse.json({ success: true, id: created.id });
}, "ADMIN_ORG_MEMBERS_CREATE");


