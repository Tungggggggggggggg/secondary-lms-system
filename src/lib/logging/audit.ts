import { prisma } from "@/lib/prisma";

export type AuditEntityType =
  | "USER"
  | "CLASSROOM"
  | "COURSE"
  | "ASSIGNMENT"
  | "ANNOUNCEMENT"
  | "ANNOUNCEMENT_COMMENT"
  | "SYSTEM"
  | string;

export type AuditMetadata = Record<string, unknown> | null;

export async function writeAudit(
  params: {
    actorId: string;
    action: string;
    entityType: AuditEntityType;
    entityId: string;
    metadata?: AuditMetadata;
    ip?: string | null;
    userAgent?: string | null;
    organizationId?: string | null;
  }
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        metadata: (params.metadata ?? undefined) as any,
        ip: params.ip ?? undefined,
        userAgent: params.userAgent ?? undefined,
        organizationId: params.organizationId ?? undefined,
      },
    });
  } catch (error) {
    console.error("[AUDIT] writeAudit error", {
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      error,
    });
  }
}


