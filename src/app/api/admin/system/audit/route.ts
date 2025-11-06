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
  if (authUser.role !== "SUPER_ADMIN") {
    return errorResponse(403, "Forbidden: SUPER_ADMIN only");
  }

  const { searchParams } = new URL(req.url);
  const { skip, take } = parsePagination(searchParams, { defaultTake: 20, maxTake: 50 });
  const entityType = searchParams.get("entityType") || undefined;
  const actorId = searchParams.get("actorId") || undefined;

  const where: any = {};
  if (entityType) where.entityType = entityType;
  if (actorId) where.actorId = actorId;

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return NextResponse.json({ success: true, items, total });
}, "ADMIN_SYSTEM_AUDIT_LIST");


