import { NextRequest, NextResponse } from "next/server";
import { requireSession, requireSuperAdmin } from "@/lib/org-scope";
import { orgRepo } from "@/lib/repositories/org-repo";
import { auditRepo } from "@/lib/repositories/audit-repo";
import { ListOrgQuerySchema, CreateOrgBodySchema } from "@/lib/validators/admin/org";
import { withRequestLogging } from "@/lib/logging/request";
import { enforceRateLimit, RateLimitError } from "@/lib/http/rate-limit";

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
    requireSuperAdmin(actor);
    enforceRateLimit({ route: "admin.org.list", ip: (req.headers.get("x-forwarded-for") || req.ip || "").split(",")[0].trim(), userId: actor.id, limit: 60 });
    const url = new URL(req.url);
    const valid = ListOrgQuerySchema.parse({ cursor: url.searchParams.get("cursor"), limit: url.searchParams.get("limit"), search: url.searchParams.get("search") });
    const data = await orgRepo.list({ cursor: valid.cursor || null, limit: valid.limit || 20, search: valid.search || null });
    const duration = Date.now() - startedAt;
    return NextResponse.json({ ok: true, data, meta: { durationMs: duration } });
  } catch (err: any) {
    const duration = Date.now() - startedAt;
    console.error(`[API][GET /api/admin/org]`, err);
    if (err instanceof RateLimitError) {
      return NextResponse.json({ ok: false, error: err.message, meta: { durationMs: duration, resetAt: err.resetAt } }, { status: 429 });
    }
    return NextResponse.json({ ok: false, error: err?.message || "Internal error", meta: { durationMs: duration } }, { status: err?.message?.startsWith("Forbidden") ? 403 : err?.message?.startsWith("Unauthorized") ? 401 : 400 });
  }
}, { action: "SUPERADMIN_ORG_LIST" });

export const POST = withRequestLogging(async (req: NextRequest) => {
  const startedAt = Date.now();
  try {
    const actor = await requireSession(req);
    requireSuperAdmin(actor);
    enforceRateLimit({ route: "admin.org.create", ip: (req.headers.get("x-forwarded-for") || req.ip || "").split(",")[0].trim(), userId: actor.id, limit: 20 });
    const body = await req.json();
    const valid = CreateOrgBodySchema.parse(body);
    const created = await orgRepo.create({ name: valid.name });

    const { ip, userAgent } = getClientInfo(req);
    await auditRepo.write({
      actorId: actor.id,
      actorRole: actor.role,
      action: "SUPERADMIN_ORG_CREATE",
      entityType: "Organization",
      entityId: created.id,
      organizationId: null,
      metadata: { name: created.name },
      ip,
      userAgent,
    });

    const duration = Date.now() - startedAt;
    return NextResponse.json({ ok: true, data: created, meta: { durationMs: duration } }, { status: 201 });
  } catch (err: any) {
    const duration = Date.now() - startedAt;
    console.error(`[API][POST /api/admin/org]`, err);
    if (err instanceof RateLimitError) {
      return NextResponse.json({ ok: false, error: err.message, meta: { durationMs: duration, resetAt: err.resetAt } }, { status: 429 });
    }
    return NextResponse.json({ ok: false, error: err?.message || "Internal error", meta: { durationMs: duration } }, { status: err?.message?.startsWith("Forbidden") ? 403 : err?.message?.startsWith("Unauthorized") ? 401 : 400 });
  }
}, { action: "SUPERADMIN_ORG_CREATE" });


