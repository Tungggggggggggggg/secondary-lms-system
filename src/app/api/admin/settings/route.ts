import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/org-scope";
import { requirePolicy } from "@/lib/rbac/policy";
import { withRequestLogging } from "@/lib/logging/request";
import { settingsRepo } from "@/lib/repositories/settings-repo";
import { enforceRateLimit, RateLimitError } from "@/lib/http/rate-limit";

export const GET = withRequestLogging(async (req: NextRequest) => {
  const startedAt = Date.now();
  try {
    const actor = await requireSession(req);
    await requirePolicy("SETTINGS_WRITE", actor); // chỉ SUPER_ADMIN mới pass
    enforceRateLimit({ route: "admin.settings.list", ip: (req.headers.get("x-forwarded-for") || req.ip || "").split(",")[0].trim(), userId: actor.id, limit: 30 });
    const data = await settingsRepo.listKeys();
    const duration = Date.now() - startedAt;
    return NextResponse.json({ ok: true, data, meta: { durationMs: duration } });
  } catch (err: any) {
    const duration = Date.now() - startedAt;
    if (err instanceof RateLimitError) {
      return NextResponse.json({ ok: false, error: err.message, meta: { durationMs: duration, resetAt: err.resetAt } }, { status: 429 });
    }
    return NextResponse.json({ ok: false, error: err?.message || "Internal error", meta: { durationMs: duration } }, { status: err?.message?.startsWith("Forbidden") ? 403 : err?.message?.startsWith("Unauthorized") ? 401 : 400 });
  }
}, { action: "ADMIN_SETTINGS_LIST" });


