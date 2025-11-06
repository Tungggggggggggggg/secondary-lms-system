import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/org-scope";
import { auditRepo } from "@/lib/repositories/audit-repo";
import { QueryAuditSchema } from "@/lib/validators/admin/audit";
import { withRequestLogging } from "@/lib/logging/request";
import { enforceRateLimit, RateLimitError } from "@/lib/http/rate-limit";

function toCsv(rows: any[]) {
  const headers = ["id", "createdAt", "action", "entityType", "entityId", "actorId", "actorRole", "organizationId", "ip", "userAgent"];
  const escape = (v: any) => {
    if (v === null || v === undefined) return "";
    const s = String(v).replace(/"/g, '""');
    return `"${s}"`;
  };
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(headers.map((h) => escape((r as any)[h])).join(","));
  }
  return lines.join("\n");
}

export const GET = withRequestLogging(async (req: NextRequest) => {
  const startedAt = Date.now();
  try {
    const actor = await requireSession(req);
    enforceRateLimit({ route: "admin.audit.query", ip: (req.headers.get("x-forwarded-for") || req.ip || "").split(",")[0].trim(), userId: actor.id, limit: 120 });
    // SUPER_ADMIN xem tất cả, role khác: chỉ xem theo org nếu được filter phía UI (có thể siết thêm sau)
    const url = new URL(req.url);
    const valid = QueryAuditSchema.parse({
      orgId: url.searchParams.get("orgId"),
      actorId: url.searchParams.get("actorId"),
      action: url.searchParams.get("action"),
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to"),
      cursor: url.searchParams.get("cursor"),
      limit: url.searchParams.get("limit"),
    });
    const res = await auditRepo.query({ organizationId: valid.orgId || null, actorId: valid.actorId || null, action: valid.action || null, from: valid.from || null, to: valid.to || null, limit: valid.limit || 50, cursor: valid.cursor || null });

    const format = url.searchParams.get("format");
    const duration = Date.now() - startedAt;
    if (format === "csv") {
      const csv = toCsv(res.items);
      return new NextResponse(csv, { status: 200, headers: { "content-type": "text/csv; charset=utf-8" } });
    }
    return NextResponse.json({ ok: true, data: res, meta: { durationMs: duration } });
  } catch (err: any) {
    const duration = Date.now() - startedAt;
    console.error(`[API][GET /api/admin/audit]`, err);
    if (err instanceof RateLimitError) {
      return NextResponse.json({ ok: false, error: err.message, meta: { durationMs: duration, resetAt: err.resetAt } }, { status: 429 });
    }
    return NextResponse.json({ ok: false, error: err?.message || "Internal error", meta: { durationMs: duration } }, { status: err?.message?.startsWith("Forbidden") ? 403 : err?.message?.startsWith("Unauthorized") ? 401 : 400 });
  }
}, { action: "ADMIN_AUDIT_QUERY" });


