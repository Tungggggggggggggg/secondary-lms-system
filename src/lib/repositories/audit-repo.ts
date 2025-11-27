import { prisma } from "@/lib/prisma";
import type { AuditMetadata } from "@/lib/logging/audit";

type AuditAction = string;

export const auditRepo = {
  async write(params: { actorId: string; actorRole?: string | null; action: AuditAction; entityType: string; entityId?: string | null; organizationId?: string | null; metadata?: AuditMetadata; ip?: string | null; userAgent?: string | null }) {
    const { actorId, actorRole, action, entityType, entityId, organizationId, metadata, ip, userAgent } = params;
    return prisma.auditLog.create({
      data: {
        actorId,
        actorRole: actorRole || null,
        action,
        entityType,
        entityId: entityId || "",
        organizationId: organizationId || null,
        metadata: metadata ? (sanitizeMetadata(metadata) as any) : undefined,
        ip: ip || null,
        userAgent: userAgent || null,
      },
      select: { id: true },
    });
  },

  async query(params: { organizationId?: string | null; actorId?: string | null; action?: string | null; from?: Date | null; to?: Date | null; limit?: number; cursor?: string | null }) {
    const { organizationId, actorId, action, from, to, limit = 50, cursor } = params;
    const where: any = {};
    if (organizationId) where.organizationId = organizationId;
    if (actorId) where.actorId = actorId;
    if (action) where.action = action;
    if (from || to) where.createdAt = { gte: from || undefined, lte: to || undefined };

    const items = await prisma.auditLog.findMany({
      where,
      take: limit + 1,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: "desc" },
      select: { id: true, action: true, entityType: true, entityId: true, actorId: true, actorRole: true, organizationId: true, createdAt: true, ip: true, userAgent: true, metadata: true },
    });
    let nextCursor: string | null = null;
    if (items.length > limit) {
      const last = items.pop()!;
      nextCursor = last.id;
    }
    return { items, nextCursor };
  },
};

// Mask PII/nhạy cảm trong metadata
function sanitizeMetadata(meta: AuditMetadata): AuditMetadata {
  if (meta && typeof meta === "object" && !Array.isArray(meta)) {
    const clone: Record<string, unknown> = {
      ...(meta as Record<string, unknown>),
    };
    for (const key of Object.keys(clone)) {
      if (/password|token|secret/i.test(key)) {
        clone[key] = "[REDACTED]";
      }
    }
    return clone;
  }
  return meta ?? null;
}


