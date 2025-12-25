import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logging/logger";

export function getOrCreateRequestId(req: NextRequest): string {
  const existing = req.headers.get("x-request-id");
  if (existing) return existing;
  // Node 18+: randomUUID
  const id = (global as any).crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return id;
}

export function withRequestLogging(
  handler: (req: NextRequest, ctx?: any) => Promise<NextResponse> | NextResponse,
  options?: { action?: string }
) {
  return async (req: NextRequest, ctx?: any) => {
    const requestId = getOrCreateRequestId(req);
    const startedAt = Date.now();
    try {
      const res = await handler(req, ctx);
      const durationMs = Date.now() - startedAt;
      logger.info("api.request", { action: options?.action || "unknown", requestId, durationMs, status: (res as any)?.status || 200 });
      // Ensure x-request-id header
      const headers = new Headers(res.headers);
      headers.set("x-request-id", requestId);
      return new NextResponse(res.body, { status: res.status, headers });
    } catch (err: any) {
      const durationMs = Date.now() - startedAt;
      logger.error("api.request.error", { action: options?.action || "unknown", requestId, durationMs, error: err?.message || String(err) });
      return NextResponse.json({ ok: false, error: err?.message || "Internal error", meta: { requestId, durationMs } }, { status: 500 });
    }
  };
}
