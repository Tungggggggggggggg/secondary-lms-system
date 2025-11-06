import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/org-scope";
import { requirePolicy } from "@/lib/rbac/policy";
import { moderationRepo } from "@/lib/repositories/moderation-repo";
import { withRequestLogging } from "@/lib/logging/request";
import { ListQueueQuerySchema } from "@/lib/validators/admin/moderation";
import { enforceRateLimit, RateLimitError } from "@/lib/http/rate-limit";

export const GET = withRequestLogging(async (req: NextRequest) => {
  const startedAt = Date.now();
  try {
    const actor = await requireSession(req);
    enforceRateLimit({ route: "admin.mod.queue", ip: (req.headers.get("x-forwarded-for") || req.ip || "").split(",")[0].trim(), userId: actor.id, limit: 120 });
    const url = new URL(req.url);
    const q = ListQueueQuerySchema.parse({ orgId: url.searchParams.get("orgId"), type: url.searchParams.get("type"), cursor: url.searchParams.get("cursor"), limit: url.searchParams.get("limit") });
    await requirePolicy("MODERATION_REVIEW", actor, q.orgId || undefined);
    const data = await moderationRepo.listQueue({ organizationId: q.orgId || undefined, type: (q.type as any) || "announcement", limit: q.limit || 20, cursor: q.cursor || null });
    const duration = Date.now() - startedAt;
    return NextResponse.json({ ok: true, data, meta: { durationMs: duration } });
  } catch (err: any) {
    const duration = Date.now() - startedAt;
    if (err instanceof RateLimitError) {
      return NextResponse.json({ ok: false, error: err.message, meta: { durationMs: duration, resetAt: err.resetAt } }, { status: 429 });
    }
    return NextResponse.json({ ok: false, error: err?.message || "Internal error", meta: { durationMs: duration } }, { status: err?.message?.startsWith("Forbidden") ? 403 : err?.message?.startsWith("Unauthorized") ? 401 : 400 });
  }
}, { action: "ADMIN_MOD_QUEUE" });


