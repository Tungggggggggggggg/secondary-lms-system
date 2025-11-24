import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, withApiLogging, errorResponse } from "@/lib/api-utils";
import { rateLimitCheck } from "@/lib/http/rate-limit";
import { parsePagination } from "@/lib/http/pagination";

// GET /api/admin/system/audit
// Chỉ SUPER_ADMIN, hỗ trợ lọc cơ bản
export const GET = withApiLogging(async (req: NextRequest) => {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const rl = rateLimitCheck(`audit:${ip}`, 60, 60_000);
  if (!rl.ok) {
    return errorResponse(429, "Too Many Requests", { resetAt: rl.resetAt });
  }
  const authUser = await getAuthenticatedUser(req);
  if (!authUser) {
    return errorResponse(401, "Unauthorized");
  }

  const { searchParams } = new URL(req.url);
  const { skip, take } = parsePagination(searchParams, { defaultTake: 20, maxTake: 50 });
  const entityType = searchParams.get("entityType") || undefined;
  const actorId = searchParams.get("actorId") || undefined;
  const entityId = searchParams.get("entityId") || undefined;
  const action = searchParams.get("action") || undefined;
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;
  const orgId = searchParams.get("orgId") || undefined;

  const where: any = {};
  if (entityType) where.entityType = entityType;
  if (actorId) where.actorId = actorId;
  if (entityId) where.entityId = entityId;
  if (action) where.action = action;
  if (orgId) where.organizationId = orgId;

  // Quyền truy cập: SUPER_ADMIN full; STAFF chỉ được xem audit theo orgId mình thuộc
  if (authUser.role !== "SUPER_ADMIN") {
    if (authUser.role === "STAFF") {
      if (!orgId) {
        return errorResponse(400, "orgId is required for STAFF");
      }
      const membership = await prisma.organizationMember.findFirst({ where: { organizationId: orgId, userId: authUser.id }, select: { id: true } });
      if (!membership) {
        return errorResponse(403, "Forbidden: not a member of organization");
      }
      // Ép lọc theo orgId, không cho phép STAFF xem ngoài phạm vi
      where.organizationId = orgId;
    } else {
      return errorResponse(403, "Forbidden");
    }
  }

  const whereDates: any = {};
  if (startDate || endDate) {
    whereDates.createdAt = {} as any;
    if (startDate) (whereDates.createdAt as any).gte = new Date(startDate);
    if (endDate) (whereDates.createdAt as any).lte = new Date(endDate);
  }

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: { ...where, ...whereDates },
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        actorId: true,
        actorRole: true,
        action: true,
        entityType: true,
        entityId: true,
        metadata: true,
        ip: true,
        userAgent: true,
        organizationId: true,
        createdAt: true,
      },
    }),
    prisma.auditLog.count({ where: { ...where, ...whereDates } }),
  ]);

  return NextResponse.json({ success: true, items, total });
}, "ADMIN_SYSTEM_AUDIT_LIST");


