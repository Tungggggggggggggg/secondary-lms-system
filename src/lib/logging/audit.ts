import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type AuditEntityType =
  | "USER"
  | "CLASSROOM"
  | "COURSE"
  | "ASSIGNMENT"
  | "ANNOUNCEMENT"
  | "ANNOUNCEMENT_COMMENT"
  | "SYSTEM"
  | string;

export async function writeAudit(
  params: {
    actorId: string;
    action: string;
    entityType: AuditEntityType;
    entityId: string;
    metadata?: Prisma.InputJsonValue;
    ip?: string | null;
    userAgent?: string | null;
  }
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        metadata: params.metadata ?? undefined,
        ip: params.ip ?? undefined,
        userAgent: params.userAgent ?? undefined,
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


