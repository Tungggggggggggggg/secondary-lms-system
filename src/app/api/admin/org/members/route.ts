import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, withApiLogging, errorResponse } from "@/lib/api-utils";
import { parsePagination } from "@/lib/http/pagination";

// GET /api/admin/org/members?orgId=xxx
export const GET = withApiLogging(async (req: NextRequest) => {
  const authUser = await getAuthenticatedUser(req);
  if (!authUser) return errorResponse(401, "Unauthorized");
  if (authUser.role !== "ADMIN" && authUser.role !== "SUPER_ADMIN") {
    return errorResponse(403, "Forbidden: ADMIN/SUPER_ADMIN only");
  }

  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgId");
  if (!orgId) return errorResponse(400, "Missing orgId");

  // Nếu là ADMIN, bắt buộc phải là thành viên của orgId
  if (authUser.role === "ADMIN") {
    const isMember = await prisma.organizationMember.findFirst({
      where: { organizationId: orgId, userId: authUser.id },
      select: { id: true },
    });
    if (!isMember) return errorResponse(403, "Forbidden: not a member of organization");
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
  if (authUser.role !== "ADMIN" && authUser.role !== "SUPER_ADMIN") {
    return errorResponse(403, "Forbidden: ADMIN/SUPER_ADMIN only");
  }

  let body: { orgId?: string; userId?: string; roleInOrg?: string } = {};
  try {
    body = await req.json();
  } catch {
    return errorResponse(400, "Invalid JSON body");
  }
  if (!body.orgId || !body.userId) {
    return errorResponse(400, "Missing orgId or userId");
  }

  // Nếu là ADMIN, bắt buộc phải là thành viên của orgId
  if (authUser.role === "ADMIN") {
    const isMember = await prisma.organizationMember.findFirst({
      where: { organizationId: body.orgId, userId: authUser.id },
      select: { id: true },
    });
    if (!isMember) return errorResponse(403, "Forbidden: not a member of organization");
  }

  const created = await prisma.organizationMember.create({
    data: {
      organizationId: body.orgId,
      userId: body.userId,
      roleInOrg: body.roleInOrg ?? null,
    },
    select: { id: true },
  });

  return NextResponse.json({ success: true, id: created.id });
}, "ADMIN_ORG_MEMBERS_CREATE");


