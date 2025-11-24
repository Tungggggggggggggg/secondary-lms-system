import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, withApiLogging, errorResponse } from "@/lib/api-utils";
import { writeAudit } from "@/lib/logging/audit";
import { requireUserWrite } from "@/lib/rbac/guards";
import { enforceRateLimit } from "@/lib/http/rate-limit";

// DELETE /api/admin/org/invites/[id]
// Huỷ lời mời dựa trên id của audit log ORG_INVITE_CREATE
export const DELETE = withApiLogging(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const authUser = await getAuthenticatedUser(req);
  if (!authUser) return errorResponse(401, "Unauthorized");

  const inviteId = params.id;
  if (!inviteId) return errorResponse(400, "Missing invite id");

  // Lấy audit log của lời mời
  const inviteAudit = await prisma.auditLog.findUnique({
    where: { id: inviteId },
    select: { id: true, organizationId: true, action: true, metadata: true },
  });
  if (!inviteAudit || inviteAudit.action !== "ORG_INVITE_CREATE") {
    return errorResponse(404, "Invite not found");
  }
  const orgId = inviteAudit.organizationId;
  if (!orgId) return errorResponse(400, "Invite missing organizationId");

  try { await requireUserWrite({ id: authUser.id, role: authUser.role }, orgId); } catch { return errorResponse(403, "Forbidden: insufficient permissions"); }

  // Rate limit theo ip+user+org
  const ip = (req.headers.get("x-forwarded-for") || (req as any).ip || "").split(",")[0].trim();
  enforceRateLimit({ route: "admin.org.invites.revoke", ip, userId: authUser.id, orgId, limit: 60 });

  // Ghi audit revoke
  await writeAudit({
    actorId: authUser.id,
    action: "ORG_INVITE_REVOKE",
    entityType: "INVITE",
    entityId: inviteId,
    organizationId: orgId,
    metadata: { email: (inviteAudit.metadata as any)?.email || null },
  });

  return NextResponse.json({ success: true });
}, "ADMIN_ORG_INVITE_REVOKE");
