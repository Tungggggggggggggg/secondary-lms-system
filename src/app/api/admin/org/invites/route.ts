import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, withApiLogging, errorResponse } from "@/lib/api-utils";
import jwt from "jsonwebtoken";
import { writeAudit } from "@/lib/logging/audit";
import { requireUserRead, requireUserWrite } from "@/lib/rbac/guards";
import { enforceRateLimit } from "@/lib/http/rate-limit";
import { parsePagination } from "@/lib/http/pagination";

// POST /api/admin/org/invites
// body: { orgId: string, email: string, role?: 'TEACHER'|'STUDENT'|'PARENT'|'ADMIN' }
// Trả về token mời (JWT) hết hạn sau 3 ngày. ADMIN hoặc SUPER_ADMIN.
export const POST = withApiLogging(async (req: NextRequest) => {
  const authUser = await getAuthenticatedUser(req);
  if (!authUser) return errorResponse(401, "Unauthorized");

  const secret = process.env.NEXTAUTH_SECRET as string | undefined;
  if (!secret) return errorResponse(500, "Missing NEXTAUTH_SECRET");

  let body: { orgId?: string; email?: string; role?: string } = {};
  try { body = await req.json(); } catch { return errorResponse(400, "Invalid JSON body"); }
  if (!body.orgId || !body.email) return errorResponse(400, "orgId and email are required");
  try { await requireUserWrite({ id: authUser.id, role: authUser.role }, body.orgId); } catch { return errorResponse(403, "Forbidden: insufficient permissions"); }

  // Rate limit theo ip+user+org để tránh spam invite
  const ip = (req.headers.get("x-forwarded-for") || (req as any).ip || "").split(",")[0].trim();
  enforceRateLimit({ route: "admin.org.invites.create", ip, userId: authUser.id, orgId: body.orgId, limit: 60 });

  const allowedRoles = ["TEACHER", "STUDENT", "PARENT", "ADMIN"] as const;
  const role = body.role && (allowedRoles as readonly string[]).includes(body.role) ? body.role : "STUDENT";

  const token = jwt.sign({ orgId: body.orgId, email: body.email, role }, secret, { expiresIn: "3d" });
  await writeAudit({ actorId: authUser.id, action: "ORG_INVITE_CREATE", entityType: "ORGANIZATION", entityId: body.orgId, metadata: { email: body.email, role } });
  return NextResponse.json({ success: true, token });
}, "ADMIN_ORG_INVITE_CREATE");

// GET /api/admin/org/invites?orgId=xxx&page=1&take=20
// Liệt kê lời mời đã tạo (dựa trên audit ORG_INVITE_CREATE) và trạng thái đã hủy (dựa trên audit ORG_INVITE_REVOKE với entityType="INVITE")
export const GET = withApiLogging(async (req: NextRequest) => {
  const authUser = await getAuthenticatedUser(req);
  if (!authUser) return errorResponse(401, "Unauthorized");

  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgId");
  if (!orgId) return errorResponse(400, "Missing orgId");

  try { await requireUserRead({ id: authUser.id, role: authUser.role }, orgId); } catch { return errorResponse(403, "Forbidden: insufficient permissions"); }

  const { skip, take } = parsePagination(searchParams, { defaultTake: 20, maxTake: 50 });

  // Lấy audit của lời mời
  const invites = await prisma.auditLog.findMany({
    where: { organizationId: orgId, action: "ORG_INVITE_CREATE" },
    orderBy: { createdAt: "desc" },
    skip,
    take,
    select: {
      id: true,
      createdAt: true,
      metadata: true,
      actorId: true,
    },
  });

  // Kiểm tra revoke theo entity INVITE
  const inviteIds = invites.map((i) => i.id);
  const revokes = await prisma.auditLog.findMany({
    where: { action: "ORG_INVITE_REVOKE", entityType: "INVITE", entityId: { in: inviteIds } },
    select: { id: true, entityId: true },
  });
  const revokedSet = new Set(revokes.map((r) => r.entityId));

  return NextResponse.json({
    success: true,
    items: invites.map((i) => ({
      id: i.id,
      createdAt: i.createdAt,
      email: (i.metadata as any)?.email || null,
      role: (i.metadata as any)?.role || null,
      revoked: revokedSet.has(i.id),
    })),
    total: await prisma.auditLog.count({ where: { organizationId: orgId, action: "ORG_INVITE_CREATE" } }),
  });
}, "ADMIN_ORG_INVITE_LIST");


