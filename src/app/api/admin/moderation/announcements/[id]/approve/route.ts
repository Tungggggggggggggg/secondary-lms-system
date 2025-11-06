import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/org-scope";
import { requirePolicy } from "@/lib/rbac/policy";
import { moderationRepo } from "@/lib/repositories/moderation-repo";
import { auditRepo } from "@/lib/repositories/audit-repo";
import { withRequestLogging } from "@/lib/logging/request";
import { enforceRateLimit, RateLimitError } from "@/lib/http/rate-limit";

export const POST = withRequestLogging(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const startedAt = Date.now();
  try {
    const actor = await requireSession(req);
    enforceRateLimit({ route: "admin.mod.ann.approve", ip: (req.headers.get("x-forwarded-for") || req.ip || "").split(",")[0].trim(), userId: actor.id, limit: 60 });
    // Lấy org theo announcement để check policy
    const ann = await (await import("@/lib/prisma")).prisma.announcement.findUnique({ where: { id: params.id }, select: { id: true, organizationId: true } });
    await requirePolicy("MODERATION_REVIEW", actor, ann?.organizationId || undefined);
    await moderationRepo.approveAnnouncement(params.id, actor.id);
    await auditRepo.write({ actorId: actor.id, actorRole: actor.role, action: "MOD_APPROVE_ANNOUNCEMENT", entityType: "Announcement", entityId: params.id, organizationId: ann?.organizationId || null, metadata: null, ip: null, userAgent: null });
    const duration = Date.now() - startedAt;
    return NextResponse.json({ ok: true, meta: { durationMs: duration } });
  } catch (err: any) {
    const duration = Date.now() - startedAt;
    if (err instanceof RateLimitError) {
      return NextResponse.json({ ok: false, error: err.message, meta: { durationMs: duration, resetAt: err.resetAt } }, { status: 429 });
    }
    return NextResponse.json({ ok: false, error: err?.message || "Internal error", meta: { durationMs: duration } }, { status: err?.message?.startsWith("Forbidden") ? 403 : err?.message?.startsWith("Unauthorized") ? 401 : 400 });
  }
}, { action: "ADMIN_MOD_APPROVE_ANN" });


