import { prisma } from "@/lib/prisma";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

type RateLimitState = {
  count: number;
  resetAt: number; // epoch ms
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseState(value: unknown): RateLimitState | null {
  if (!isRecord(value)) return null;
  const count = value.count;
  const resetAt = value.resetAt;
  if (typeof count !== "number" || !Number.isFinite(count) || count < 0) return null;
  if (typeof resetAt !== "number" || !Number.isFinite(resetAt) || resetAt <= 0) return null;
  return { count, resetAt };
}

function keyFor(params: { scope: string; key: string }): string {
  return `rate_limit:${params.scope}:${params.key}`;
}

/**
 * Kiểm tra và ghi nhận rate limit dựa trên SystemSetting.
 *
 * Output dùng để trả 429 với `retryAfterSeconds` khi vượt giới hạn.
 *
 * Side effects:
 * - Đọc/ghi bảng `system_settings`.
 */
export async function checkRateLimit(params: {
  scope: string;
  key: string;
  limit: number;
  windowMs: number;
}): Promise<RateLimitResult> {
  const now = Date.now();
  const limit = Math.max(1, Math.floor(params.limit));
  const windowMs = Math.max(1_000, Math.floor(params.windowMs));

  const storageKey = keyFor({ scope: params.scope, key: params.key });

  const result = await prisma.$transaction(async (tx) => {
    const row = await tx.systemSetting.findUnique({
      where: { key: storageKey },
      select: { value: true },
    });

    const current = parseState(row?.value ?? null);

    const resetAt = !current || now >= current.resetAt ? now + windowMs : current.resetAt;
    const count = !current || now >= current.resetAt ? 0 : current.count;

    if (count >= limit) {
      const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - now) / 1000));
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds,
        next: { count, resetAt } satisfies RateLimitState,
      };
    }

    const nextState: RateLimitState = { count: count + 1, resetAt };
    const remaining = Math.max(0, limit - nextState.count);

    await tx.systemSetting.upsert({
      where: { key: storageKey },
      update: { value: { count: nextState.count, resetAt: nextState.resetAt } },
      create: { key: storageKey, value: { count: nextState.count, resetAt: nextState.resetAt } },
      select: { key: true },
    });

    return {
      allowed: true,
      remaining,
      retryAfterSeconds: 0,
      next: nextState,
    };
  });

  return { allowed: result.allowed, remaining: result.remaining, retryAfterSeconds: result.retryAfterSeconds };
}

/**
 * Lấy IP client theo header phổ biến trên Vercel/Proxy.
 */
export function getClientIp(req: { headers: Headers }): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}
