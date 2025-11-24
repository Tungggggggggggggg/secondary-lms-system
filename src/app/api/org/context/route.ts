import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, withApiLogging, errorResponse } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/logging/audit";
import { resolveOrgId } from "@/lib/org-scope";

// GET /api/org/context -> trả về orgId hiện tại (ưu tiên query/header/cookie)
export const GET = withApiLogging(async (req: NextRequest) => {
  const orgId = resolveOrgId(req);
  return NextResponse.json({ success: true, orgId: orgId || null });
}, "ORG_CONTEXT_GET");

// POST /api/org/context { orgId } -> set cookie x-org-id sau khi xác thực phạm vi
export const POST = withApiLogging(async (req: NextRequest) => {
  const user = await getAuthenticatedUser(req);
  if (!user) return errorResponse(401, "Unauthorized");

  let body: { orgId?: string } = {};
  try { body = await req.json(); } catch { return errorResponse(400, "Invalid JSON body"); }
  const orgId = (body.orgId || "").trim();
  if (!orgId) return errorResponse(400, "orgId is required");

  // SUPER_ADMIN được phép chọn bất kỳ org
  if (user.role !== "SUPER_ADMIN") {
    const membership = await prisma.organizationMember.findFirst({ where: { organizationId: orgId, userId: user.id }, select: { id: true } });
    if (!membership) return errorResponse(403, "Forbidden: not a member of organization");
  }

  const res = NextResponse.json({ success: true, orgId });
  res.cookies.set("x-org-id", orgId, { path: "/", sameSite: "lax" });
  try {
    await writeAudit({ actorId: user.id, action: "ORG_CONTEXT_SET", entityType: "ORGANIZATION", entityId: orgId, metadata: undefined });
  } catch (e) {
    console.error("[ORG_CONTEXT_SET] audit failed", e);
  }
  return res;
}, "ORG_CONTEXT_SET");
