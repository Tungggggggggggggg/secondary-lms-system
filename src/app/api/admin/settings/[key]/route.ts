import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/org-scope";
import { requireSettingsWrite } from "@/lib/rbac/guards";
import { withRequestLogging } from "@/lib/logging/request";
import { settingsRepo } from "@/lib/repositories/settings-repo";
import { SettingKeyParamSchema, SettingBodySchema } from "@/lib/validators/admin/settings";
import { enforceRateLimit, RateLimitError } from "@/lib/http/rate-limit";

export const GET = withRequestLogging(async (req: NextRequest, { params }: { params: { key: string } }) => {
  const startedAt = Date.now();
  try {
    const actor = await requireSession(req);
    await requireSettingsWrite(actor);
    enforceRateLimit({ route: "admin.settings.get", ip: (req.headers.get("x-forwarded-for") || req.ip || "").split(",")[0].trim(), userId: actor.id, limit: 60 });
    const { key } = SettingKeyParamSchema.parse(params);
    const value = await settingsRepo.get(key);
    const duration = Date.now() - startedAt;
    return NextResponse.json({ ok: true, data: { key, value }, meta: { durationMs: duration } });
  } catch (err: any) {
    const duration = Date.now() - startedAt;
    if (err instanceof RateLimitError) {
      return NextResponse.json({ ok: false, error: err.message, meta: { durationMs: duration, resetAt: err.resetAt } }, { status: 429 });
    }
    return NextResponse.json({ ok: false, error: err?.message || "Internal error", meta: { durationMs: duration } }, { status: err?.message?.startsWith("Forbidden") ? 403 : err?.message?.startsWith("Unauthorized") ? 401 : 400 });
  }
}, { action: "ADMIN_SETTINGS_GET" });

export const PUT = withRequestLogging(async (req: NextRequest, { params }: { params: { key: string } }) => {
  const startedAt = Date.now();
  try {
    const actor = await requireSession(req);
    await requireSettingsWrite(actor);
    enforceRateLimit({ route: "admin.settings.set", ip: (req.headers.get("x-forwarded-for") || req.ip || "").split(",")[0].trim(), userId: actor.id, limit: 20 });
    const { key } = SettingKeyParamSchema.parse(params);
    const body = await req.json();
    const { value } = SettingBodySchema.parse(body);
    await settingsRepo.set(key, value ?? null);
    const duration = Date.now() - startedAt;
    return NextResponse.json({ ok: true, meta: { durationMs: duration } });
  } catch (err: any) {
    const duration = Date.now() - startedAt;
    if (err instanceof RateLimitError) {
      return NextResponse.json({ ok: false, error: err.message, meta: { durationMs: duration, resetAt: err.resetAt } }, { status: 429 });
    }
    return NextResponse.json({ ok: false, error: err?.message || "Internal error", meta: { durationMs: duration } }, { status: err?.message?.startsWith("Forbidden") ? 403 : err?.message?.startsWith("Unauthorized") ? 401 : 400 });
  }
}, { action: "ADMIN_SETTINGS_SET" });

export const DELETE = withRequestLogging(async (req: NextRequest, { params }: { params: { key: string } }) => {
  const startedAt = Date.now();
  try {
    const actor = await requireSession(req);
    await requireSettingsWrite(actor);
    enforceRateLimit({ route: "admin.settings.delete", ip: (req.headers.get("x-forwarded-for") || req.ip || "").split(",")[0].trim(), userId: actor.id, limit: 20 });
    const { key } = SettingKeyParamSchema.parse(params);
    await settingsRepo.remove(key);
    const duration = Date.now() - startedAt;
    return NextResponse.json({ ok: true, meta: { durationMs: duration } });
  } catch (err: any) {
    const duration = Date.now() - startedAt;
    if (err instanceof RateLimitError) {
      return NextResponse.json({ ok: false, error: err.message, meta: { durationMs: duration, resetAt: err.resetAt } }, { status: 429 });
    }
    return NextResponse.json({ ok: false, error: err?.message || "Internal error", meta: { durationMs: duration } }, { status: err?.message?.startsWith("Forbidden") ? 403 : err?.message?.startsWith("Unauthorized") ? 401 : 400 });
  }
}, { action: "ADMIN_SETTINGS_DELETE" });


