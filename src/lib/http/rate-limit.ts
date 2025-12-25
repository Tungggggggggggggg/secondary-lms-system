// Rate limit đơn giản in-memory theo key (ip + route + user/org)
const store = new Map<string, { count: number; resetAt: number }>();

export function rateLimitCheck(key: string, limit: number, windowMs: number): { ok: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const rec = store.get(key);
  if (!rec || rec.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, resetAt: now + windowMs };
  }
  if (rec.count < limit) {
    rec.count += 1;
    return { ok: true, remaining: limit - rec.count, resetAt: rec.resetAt };
  }
  return { ok: false, remaining: 0, resetAt: rec.resetAt };
}

export class RateLimitError extends Error {
  remaining: number;
  resetAt: number;
  limit: number;
  constructor(message: string, opts: { remaining: number; resetAt: number; limit: number }) {
    super(message);
    this.name = "RateLimitError";
    this.remaining = opts.remaining;
    this.resetAt = opts.resetAt;
    this.limit = opts.limit;
  }
}

export type RateParams = {
  route: string;
  ip?: string | null;
  userId?: string | null;
  orgId?: string | null;
  limit?: number; // mặc định theo method phía route
  windowMs?: number; // mặc định 60_000
};

export function computeKey(p: RateParams) {
  const ip = p.ip || "anon";
  const user = p.userId || "-";
  const org = p.orgId || "-";
  return `rl:${p.route}:${ip}:${user}:${org}`;
}

export function enforceRateLimit(p: RateParams) {
  const limit = p.limit ?? 60;
  const windowMs = p.windowMs ?? 60_000;
  const key = computeKey(p);
  const res = rateLimitCheck(key, limit, windowMs);
  if (!res.ok) {
    throw new RateLimitError("Too Many Requests", { remaining: res.remaining, resetAt: res.resetAt, limit });
  }
  return { ...res, limit };
}


