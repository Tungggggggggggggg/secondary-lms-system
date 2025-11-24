import type { Actor } from "./policy";
import { requireCan } from "./policy";

export async function requireOrgRead(actor: Actor, orgId: string) {
  await requireCan("ORGANIZATION", "READ", actor, orgId);
}

export async function requireOrgWrite(actor: Actor, orgId: string) {
  await requireCan("ORGANIZATION", "WRITE", actor, orgId);
}

export async function requireUserRead(actor: Actor, orgId?: string | null) {
  await requireCan("USER", "READ", actor, orgId ?? null);
}

export async function requireUserWrite(actor: Actor, orgId?: string | null) {
  await requireCan("USER", "WRITE", actor, orgId ?? null);
}

export async function requireReportsRead(actor: Actor, orgId?: string | null) {
  await requireCan("REPORTS", "READ", actor, orgId ?? null);
}

export async function requireModerationReview(actor: Actor, orgId?: string | null) {
  await requireCan("MODERATION", "REVIEW", actor, orgId ?? null);
}

export async function requireSettingsWrite(actor: Actor) {
  await requireCan("SETTINGS", "WRITE", actor, null);
}

export async function requireAuditRead(actor: Actor, orgId?: string | null) {
  await requireCan("AUDIT", "READ", actor, orgId ?? null);
}
