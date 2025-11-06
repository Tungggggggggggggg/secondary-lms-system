import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/org-scope";
import { requirePolicy } from "@/lib/rbac/policy";
import { withRequestLogging } from "@/lib/logging/request";
import { ReportsQuerySchema } from "@/lib/validators/admin/reports";
import { reportsRepo } from "@/lib/repositories/reports-repo";
import { enforceRateLimit, RateLimitError } from "@/lib/http/rate-limit";

export const GET = withRequestLogging(async (req: NextRequest) => {
  const startedAt = Date.now();
  try {
    const actor = await requireSession(req);
    enforceRateLimit({ route: "admin.reports.overview", ip: (req.headers.get("x-forwarded-for") || req.ip || "").split(",")[0].trim(), userId: actor.id, limit: 60 });
    const url = new URL(req.url);
    const q = ReportsQuerySchema.parse({ orgId: url.searchParams.get("orgId") });
    await requirePolicy("REPORTS_READ", actor, q.orgId || undefined);
    const data = await reportsRepo.overview(q.orgId || null);
    const duration = Date.now() - startedAt;
    return NextResponse.json({ ok: true, data, meta: { durationMs: duration } });
  } catch (err: any) {
    const duration = Date.now() - startedAt;
    if (err instanceof RateLimitError) {
      return NextResponse.json({ ok: false, error: err.message, meta: { durationMs: duration, resetAt: err.resetAt } }, { status: 429 });
    }
    return NextResponse.json({ ok: false, error: err?.message || "Internal error", meta: { durationMs: duration } }, { status: err?.message?.startsWith("Forbidden") ? 403 : err?.message?.startsWith("Unauthorized") ? 401 : 400 });
  }
}, { action: "ADMIN_REPORTS_OVERVIEW" });


