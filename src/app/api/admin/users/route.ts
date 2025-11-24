import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireSession, resolveOrgId } from "@/lib/org-scope";
import { userRepo } from "@/lib/repositories/user-repo";
import { auditRepo } from "@/lib/repositories/audit-repo";
import { ListUsersQuerySchema, CreateUserBodySchema } from "@/lib/validators/admin/users";
import { withRequestLogging } from "@/lib/logging/request";
import { enforceRateLimit, RateLimitError } from "@/lib/http/rate-limit";
import { requireUserRead, requireUserWrite } from "@/lib/rbac/guards";

function getClientInfo(req: NextRequest) {
  return {
    ip: (req.headers.get("x-forwarded-for") || req.ip || "").split(",")[0].trim() || null,
    userAgent: req.headers.get("user-agent") || null,
  };
}

export const GET = withRequestLogging(async (req: NextRequest) => {
  const startedAt = Date.now();
  try {
    const actor = await requireSession(req);
    const orgId = resolveOrgId(req);
    // Rate limit GET list: 120 req/min theo ip+user+org
    enforceRateLimit({ route: "admin.users.list", ip: (req.headers.get("x-forwarded-for") || req.ip || "").split(",")[0].trim(), userId: actor.id, orgId: orgId || null, limit: 120 });
    const valid = ListUsersQuerySchema.parse({
      orgId,
      cursor: new URL(req.url).searchParams.get("cursor"),
      limit: new URL(req.url).searchParams.get("limit"),
      search: new URL(req.url).searchParams.get("search"),
    });
    await requireUserRead(actor, valid.orgId);

    const data = await userRepo.listByOrganization({ organizationId: valid.orgId, limit: valid.limit || 20, cursor: valid.cursor || null, search: valid.search || null });
    const duration = Date.now() - startedAt;
    return NextResponse.json({ ok: true, data, meta: { durationMs: duration } });
  } catch (err: any) {
    const duration = Date.now() - startedAt;
    console.error(`[API][GET /api/admin/users]`, err);
    if (err instanceof RateLimitError) {
      return NextResponse.json({ ok: false, error: err.message, meta: { durationMs: duration, resetAt: err.resetAt } }, { status: 429 });
    }
    return NextResponse.json({ ok: false, error: err?.message || "Internal error", meta: { durationMs: duration } }, { status: err?.message?.startsWith("Forbidden") ? 403 : err?.message?.startsWith("Unauthorized") ? 401 : 400 });
  }
}, { action: "ADMIN_USERS_LIST" });

export const POST = withRequestLogging(async (req: NextRequest) => {
  const startedAt = Date.now();
  try {
    const actor = await requireSession(req);
    const body = await req.json();
    enforceRateLimit({ route: "admin.users.create", ip: (req.headers.get("x-forwarded-for") || req.ip || "").split(",")[0].trim(), userId: actor.id, orgId: body?.orgId || null, limit: 30 });
    const valid = CreateUserBodySchema.parse(body);
    const orgId = valid.orgId;
    await requireUserWrite(actor, orgId);

    const passwordHash = await bcrypt.hash(valid.password, 10);
    const created = await userRepo.createUser({ email: valid.email, fullname: valid.fullname, passwordHash, globalRole: valid.role as any, organizationId: orgId });

    const { ip, userAgent } = getClientInfo(req);
    await auditRepo.write({
      actorId: actor.id,
      actorRole: actor.role,
      action: "ADMIN_USER_CREATE",
      entityType: "User",
      entityId: created.id,
      organizationId: orgId,
      metadata: { email: created.email },
      ip,
      userAgent,
    });

    const duration = Date.now() - startedAt;
    return NextResponse.json({ ok: true, data: created, meta: { durationMs: duration } }, { status: 201 });
  } catch (err: any) {
    const duration = Date.now() - startedAt;
    console.error(`[API][POST /api/admin/users]`, err);
    if (err instanceof RateLimitError) {
      return NextResponse.json({ ok: false, error: err.message, meta: { durationMs: duration, resetAt: err.resetAt } }, { status: 429 });
    }
    return NextResponse.json({ ok: false, error: err?.message || "Internal error", meta: { durationMs: duration } }, { status: err?.message?.startsWith("Forbidden") ? 403 : err?.message?.startsWith("Unauthorized") ? 401 : 400 });
  }
}, { action: "ADMIN_USERS_CREATE" });


