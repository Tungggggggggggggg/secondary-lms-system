import { NextRequest, NextResponse } from "next/server";
import { requireSession, requireSuperAdmin } from "@/lib/org-scope";
import { orgRepo } from "@/lib/repositories/org-repo";
import { auditRepo } from "@/lib/repositories/audit-repo";
import { UpdateOrgBodySchema } from "@/lib/validators/admin/org";
import { withRequestLogging } from "@/lib/logging/request";
import { enforceRateLimit, RateLimitError } from "@/lib/http/rate-limit";

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
    requireSuperAdmin(actor);
    enforceRateLimit({ route: "admin.org.update", ip: (req.headers.get("x-forwarded-for") || req.ip || "").split(",")[0].trim(), userId: actor.id, limit: 30 });
    const body = await req.json();
    const valid = UpdateOrgBodySchema.parse(body);
    const updated = await orgRepo.update(params.id, { name: valid.name, status: valid.status as any });

    const { ip, userAgent } = getClientInfo(req);
    await auditRepo.write({
      actorId: actor.id,
      actorRole: actor.role,
      action: "SUPERADMIN_ORG_UPDATE",
      entityType: "Organization",
      entityId: params.id,
      organizationId: params.id,
      metadata: { fields: Object.keys(valid) },
      ip,
      userAgent,
    });

    const duration = Date.now() - startedAt;
    return NextResponse.json({ ok: true, data: updated, meta: { durationMs: duration } });
  } catch (err: any) {
    const duration = Date.now() - startedAt;
    console.error(`[API][PATCH /api/admin/org/:id]`, err);
    if (err instanceof RateLimitError) {
      return NextResponse.json({ ok: false, error: err.message, meta: { durationMs: duration, resetAt: err.resetAt } }, { status: 429 });
    }
    return NextResponse.json({ ok: false, error: err?.message || "Internal error", meta: { durationMs: duration } }, { status: err?.message?.startsWith("Forbidden") ? 403 : err?.message?.startsWith("Unauthorized") ? 401 : 400 });
  }
}, { action: "SUPERADMIN_ORG_UPDATE" });


