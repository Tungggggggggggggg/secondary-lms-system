import { NextRequest, NextResponse } from "next/server";
import { requireSession, resolveOrgId } from "@/lib/org-scope";
import { userRepo } from "@/lib/repositories/user-repo";
import { auditRepo } from "@/lib/repositories/audit-repo";
import { UpdateUserBodySchema } from "@/lib/validators/admin/users";
import { withRequestLogging } from "@/lib/logging/request";
import { enforceRateLimit, RateLimitError } from "@/lib/http/rate-limit";
import { requireUserWrite } from "@/lib/rbac/guards";

function getClientInfo(req: NextRequest) {
  return {
    ip: (req.headers.get("x-forwarded-for") || req.ip || "").split(",")[0].trim() || null,
    userAgent: req.headers.get("user-agent") || null,
  };
}

export const PATCH = withRequestLogging(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const startedAt = Date.now();
  try {
    const actor = await requireSession(req);
    const orgId = resolveOrgId(req);
    enforceRateLimit({ route: "admin.users.update", ip: (req.headers.get("x-forwarded-for") || req.ip || "").split(",")[0].trim(), userId: actor.id, orgId: orgId || null, limit: 30 });
    await requireUserWrite(actor, orgId!);
    const body = await req.json();
    const valid = UpdateUserBodySchema.parse(body);
    const updated = await userRepo.updateUser({
      id: params.id,
      fullname: valid.fullname,
      email: valid.email,
      globalRole: actor.role === "SUPER_ADMIN" ? (valid.role as any) : undefined,
    });

    const { ip, userAgent } = getClientInfo(req);
    await auditRepo.write({
      actorId: actor.id,
      actorRole: actor.role,
      action: "ADMIN_USER_UPDATE",
      entityType: "User",
      entityId: params.id,
      organizationId: orgId || null,
      metadata: { fields: Object.keys(valid) },
      ip,
      userAgent,
    });

    const duration = Date.now() - startedAt;
    return NextResponse.json({ ok: true, data: updated, meta: { durationMs: duration } });
  } catch (err: any) {
    const duration = Date.now() - startedAt;
    console.error(`[API][PATCH /api/admin/users/:id]`, err);
    if (err instanceof RateLimitError) {
      return NextResponse.json({ ok: false, error: err.message, meta: { durationMs: duration, resetAt: err.resetAt } }, { status: 429 });
    }
    return NextResponse.json({ ok: false, error: err?.message || "Internal error", meta: { durationMs: duration } }, { status: err?.message?.startsWith("Forbidden") ? 403 : err?.message?.startsWith("Unauthorized") ? 401 : 400 });
  }
}, { action: "ADMIN_USERS_UPDATE" });

export const DELETE = withRequestLogging(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const startedAt = Date.now();
  try {
    const actor = await requireSession(req);
    const orgId = resolveOrgId(req);
    enforceRateLimit({ route: "admin.users.delete", ip: (req.headers.get("x-forwarded-for") || req.ip || "").split(",")[0].trim(), userId: actor.id, orgId: orgId || null, limit: 30 });
    await requireUserWrite(actor, orgId!);
    await userRepo.removeFromOrganization({ userId: params.id, organizationId: orgId! });

    const { ip, userAgent } = getClientInfo(req);
    await auditRepo.write({
      actorId: actor.id,
      actorRole: actor.role,
      action: "ADMIN_USER_REMOVE_FROM_ORG",
      entityType: "User",
      entityId: params.id,
      organizationId: orgId || null,
      metadata: null,
      ip,
      userAgent,
    });

    const duration = Date.now() - startedAt;
    return NextResponse.json({ ok: true, meta: { durationMs: duration } }, { status: 204 });
  } catch (err: any) {
    const duration = Date.now() - startedAt;
    console.error(`[API][DELETE /api/admin/users/:id]`, err);
    if (err instanceof RateLimitError) {
      return NextResponse.json({ ok: false, error: err.message, meta: { durationMs: duration, resetAt: err.resetAt } }, { status: 429 });
    }
    return NextResponse.json({ ok: false, error: err?.message || "Internal error", meta: { durationMs: duration } }, { status: err?.message?.startsWith("Forbidden") ? 403 : err?.message?.startsWith("Unauthorized") ? 401 : 400 });
  }
}, { action: "ADMIN_USERS_REMOVE_FROM_ORG" });


