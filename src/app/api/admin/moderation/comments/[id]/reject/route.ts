import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/org-scope";
import { requirePolicy } from "@/lib/rbac/policy";
import { moderationRepo } from "@/lib/repositories/moderation-repo";
import { auditRepo } from "@/lib/repositories/audit-repo";
import { withRequestLogging } from "@/lib/logging/request";
import { ModerationBodySchema } from "@/lib/validators/admin/moderation";
import { enforceRateLimit, RateLimitError } from "@/lib/http/rate-limit";
import { resolveOrgId } from "@/lib/org-scope";

export const POST = withRequestLogging(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const startedAt = Date.now();
  try {
    const actor = await requireSession(req);
    enforceRateLimit({ route: "admin.mod.cmt.reject", ip: (req.headers.get("x-forwarded-for") || req.ip || "").split(",")[0].trim(), userId: actor.id, limit: 60 });
    const body = await req.json();
    const { reason } = ModerationBodySchema.parse(body);
    const cm = await (await import("@/lib/prisma")).prisma.announcementComment.findUnique({ where: { id: params.id }, select: { id: true, announcement: { select: { organizationId: true } } } });
    const orgId = cm?.announcement?.organizationId || null;
    const selectedOrg = resolveOrgId(req);
    if (actor.role === "SUPER_ADMIN") {
      if (!selectedOrg) {
        return NextResponse.json({ ok: false, error: "Vui lòng chọn Trường/Đơn vị trước khi thực hiện thao tác này" }, { status: 400 });
      }
      if (orgId && selectedOrg !== orgId) {
        return NextResponse.json({ ok: false, error: "Phạm vi Trường/Đơn vị không khớp với nội dung" }, { status: 400 });
      }
    }
    await requirePolicy("MODERATION_REVIEW", actor, orgId || undefined);
    await moderationRepo.rejectComment(params.id, actor.id, reason || "");
    await auditRepo.write({ actorId: actor.id, actorRole: actor.role, action: "MOD_REJECT_COMMENT", entityType: "AnnouncementComment", entityId: params.id, organizationId: orgId, metadata: { reason: reason || null }, ip: null, userAgent: null });
    const duration = Date.now() - startedAt;
    return NextResponse.json({ ok: true, meta: { durationMs: duration } });
  } catch (err: any) {
    const duration = Date.now() - startedAt;
    if (err instanceof RateLimitError) {
      return NextResponse.json({ ok: false, error: err.message, meta: { durationMs: duration, resetAt: err.resetAt } }, { status: 429 });
    }
    return NextResponse.json({ ok: false, error: err?.message || "Internal error", meta: { durationMs: duration } }, { status: err?.message?.startsWith("Forbidden") ? 403 : err?.message?.startsWith("Unauthorized") ? 401 : 400 });
  }
}, { action: "ADMIN_MOD_REJECT_CM" });


