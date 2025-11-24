import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/org-scope";
import { requireModerationReview } from "@/lib/rbac/guards";
import { moderationRepo } from "@/lib/repositories/moderation-repo";
import { withRequestLogging } from "@/lib/logging/request";
import { ListQueueQuerySchema } from "@/lib/validators/admin/moderation";
import { enforceRateLimit, RateLimitError } from "@/lib/http/rate-limit";
import { resolveOrgId } from "@/lib/org-scope";
import { prisma } from "@/lib/prisma";

export const GET = withRequestLogging(async (req: NextRequest) => {
  const startedAt = Date.now();
  try {
    const actor = await requireSession(req);
    enforceRateLimit({ route: "admin.mod.queue", ip: (req.headers.get("x-forwarded-for") || req.ip || "").split(",")[0].trim(), userId: actor.id, limit: 120 });
    const url = new URL(req.url);
    const q = ListQueueQuerySchema.parse({
      orgId: url.searchParams.get("orgId"),
      type: url.searchParams.get("type"),
      status: url.searchParams.get("status"),
      startDate: url.searchParams.get("startDate"),
      endDate: url.searchParams.get("endDate"),
      cursor: url.searchParams.get("cursor"),
      limit: url.searchParams.get("limit"),
    });
    let orgId = q.orgId || resolveOrgId(req) || undefined;
    if (!orgId && actor.role !== "SUPER_ADMIN") {
      const mem = await prisma.organizationMember.findFirst({ where: { userId: actor.id }, select: { organizationId: true } });
      orgId = mem?.organizationId || undefined;
    }
    await requireModerationReview(actor, orgId);
    const data = await moderationRepo.listQueue({
      organizationId: orgId || undefined,
      type: (q.type as any) || "announcement",
      status: (q.status as any) || undefined,
      startDate: (q.startDate as any) || undefined,
      endDate: (q.endDate as any) || undefined,
      limit: q.limit || 20,
      cursor: q.cursor || null,
    });
    // Tính counts theo trạng thái để hiển thị tổng quan
    const dateFilter: any = {};
    if (q.startDate) dateFilter.gte = new Date(q.startDate);
    if (q.endDate) {
      const d = new Date(q.endDate);
      d.setHours(23, 59, 59, 999);
      dateFilter.lte = d;
    }
    const type = ((q.type as any) || "announcement") as "announcement" | "comment";
    if (type === "announcement") {
      const baseWhere: any = {
        ...(orgId ? { organizationId: orgId } : {}),
        ...(q.startDate || q.endDate ? { createdAt: dateFilter } : {}),
      };
      const [pending, approved, rejected] = await Promise.all([
        prisma.announcement.count({ where: { ...baseWhere, status: "PENDING" } }),
        prisma.announcement.count({ where: { ...baseWhere, status: "APPROVED" } }),
        prisma.announcement.count({ where: { ...baseWhere, status: "REJECTED" } }),
      ]);
      (data as any).counts = { pending, approved, rejected };
    } else {
      const baseWhere: any = {
        ...(orgId ? { announcement: { organizationId: orgId } } : {}),
        ...(q.startDate || q.endDate ? { createdAt: dateFilter } : {}),
      };
      const [pending, approved, rejected] = await Promise.all([
        prisma.announcementComment.count({ where: { ...baseWhere, status: "PENDING" } }),
        prisma.announcementComment.count({ where: { ...baseWhere, status: "APPROVED" } }),
        prisma.announcementComment.count({ where: { ...baseWhere, status: "REJECTED" } }),
      ]);
      (data as any).counts = { pending, approved, rejected };
    }
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


