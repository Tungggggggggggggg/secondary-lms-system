import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, withApiLogging, errorResponse } from "@/lib/api-utils";
import { requireModerationReview } from "@/lib/rbac/guards";
import { writeAudit } from "@/lib/logging/audit";
import { isStaffRole, isSuperAdminRole } from "@/lib/rbac/policy";

// GET: danh sách pending
export const GET = withApiLogging(async (req: NextRequest) => {
  const authUser = await getAuthenticatedUser(req);
  if (!authUser) return errorResponse(401, "Unauthorized");

  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgId");
  try { await requireModerationReview({ id: authUser.id, role: authUser.role }, orgId || undefined as any); } catch { return errorResponse(403, "Forbidden: insufficient permissions"); }
  if (!orgId) return errorResponse(400, "Missing or invalid orgId");

  const items = await prisma.announcement.findMany({
    where: { status: "PENDING" as any, organizationId: orgId },
    orderBy: { createdAt: "asc" },
    select: { id: true, content: true, classroomId: true, authorId: true, createdAt: true },
  });
  return NextResponse.json({ success: true, items });
}, "ADMIN_ORG_MOD_ANNOUNCEMENTS_LIST");

// POST: duyệt/ẩn hàng loạt
// body: { ids: string[], action: 'APPROVE'|'REJECT', reason?: string }
export const POST = withApiLogging(async (req: NextRequest) => {
  const authUser = await getAuthenticatedUser(req);
  if (!authUser) return errorResponse(401, "Unauthorized");
  if (!isStaffRole(authUser.role) && !isSuperAdminRole(authUser.role)) {
    return errorResponse(403, "Forbidden: ADMIN/SUPER_ADMIN only");
  }

  let body: { ids?: string[]; action?: string; reason?: string } = {};
  try { body = await req.json(); } catch { return errorResponse(400, "Invalid JSON body"); }
  if (!Array.isArray(body.ids) || body.ids.length === 0) return errorResponse(400, "ids required");
  if (!body.action || !["APPROVE", "REJECT"].includes(body.action)) return errorResponse(400, "invalid action");

  // Enforce org-scope for ADMIN: tất cả announcements phải thuộc các tổ chức mà admin là thành viên
  if (isStaffRole(authUser.role)) {
    const annOrgs = await prisma.announcement.findMany({
      where: { id: { in: body.ids } },
      select: { organizationId: true },
    });
    const orgIds = Array.from(new Set(annOrgs.map(x => x.organizationId).filter((x): x is string => !!x)));
    if (orgIds.length === 0) {
      return errorResponse(400, "No valid announcements found for moderation");
    }
    const memberships = await prisma.organizationMember.findMany({
      where: { userId: authUser.id, organizationId: { in: orgIds } },
      select: { organizationId: true },
    });
    const hasAll = orgIds.every(oid => memberships.some(m => m.organizationId === oid));
    if (!hasAll) return errorResponse(403, "Forbidden: some announcements are outside of your organization scope");
  }

  const status = body.action === "APPROVE" ? "APPROVED" : "REJECTED";
  const now = new Date();
  await prisma.announcement.updateMany({
    where: { id: { in: body.ids } },
    data: {
      status: status as any,
      moderatedById: authUser.id,
      moderatedAt: now,
      moderationReason: body.reason ?? null,
    },
  });

  await writeAudit({ actorId: authUser.id, action: `ANNOUNCEMENT_${status}`, entityType: "ANNOUNCEMENT", entityId: body.ids.join(","), metadata: { reason: body.reason } });

  return NextResponse.json({ success: true });
}, "ADMIN_ORG_MOD_ANNOUNCEMENTS_MODERATE");


