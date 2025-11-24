import 'server-only'
import { prisma } from "@/lib/prisma";

// Role helpers (giữ trong server module này cho các import cũ)
export function isSuperAdminRole(role?: string | null): boolean {
  return role === "SUPER_ADMIN";
}

export function isAdminRole(role?: string | null): boolean {
  return role === "STAFF";
}

export function isStaffRole(role?: string | null): boolean {
  return role === "STAFF";
}

// Các hành động chuẩn hóa cho RBAC
export type PolicyAction =
  | "ORG_READ"
  | "ORG_WRITE"
  | "USER_READ"
  | "USER_WRITE"
  | "AUDIT_READ"
  | "MODERATION_REVIEW"
  | "SETTINGS_WRITE"
  | "REPORTS_READ";

export type Actor = { id: string; role: string };

// Kiểm tra quyền theo vai trò và phạm vi tổ chức
export async function hasPolicy(action: PolicyAction, actor: Actor, orgId?: string | null): Promise<boolean> {
  // SUPER_ADMIN: full quyền
  if (actor.role === "SUPER_ADMIN") return true;

  // STAFF/ADMIN: giới hạn trong phạm vi tổ chức
  if (isStaffRole(actor.role)) {
    const orgScopedActions: PolicyAction[] = [
      "ORG_READ",
      "ORG_WRITE",
      "USER_READ",
      "USER_WRITE",
      "AUDIT_READ",
      "MODERATION_REVIEW",
      "REPORTS_READ",
    ];
    if (!orgScopedActions.includes(action)) return false;
    if (!orgId) return false;
    const ok = await isMemberCached(actor.id, orgId);
    return ok;
  }

  // Các vai trò còn lại: mặc định không có quyền trên trang Admin
  return false;
}

export async function requirePolicy(action: PolicyAction, actor: Actor, orgId?: string | null): Promise<void> {
  const ok = await hasPolicy(action, actor, orgId);
  if (!ok) {
    throw new Error("Forbidden: insufficient permissions");
  }
}

export type Resource =
  | "ORGANIZATION"
  | "USER"
  | "AUDIT"
  | "MODERATION"
  | "SETTINGS"
  | "REPORTS";

export type Action = "READ" | "WRITE" | "REVIEW";

function mapToPolicyAction(resource: Resource, action: Action): PolicyAction | null {
  if (resource === "ORGANIZATION" && action === "READ") return "ORG_READ";
  if (resource === "ORGANIZATION" && action === "WRITE") return "ORG_WRITE";
  if (resource === "USER" && action === "READ") return "USER_READ";
  if (resource === "USER" && action === "WRITE") return "USER_WRITE";
  if (resource === "AUDIT" && action === "READ") return "AUDIT_READ";
  if (resource === "MODERATION" && action === "REVIEW") return "MODERATION_REVIEW";
  if (resource === "SETTINGS" && action === "WRITE") return "SETTINGS_WRITE";
  if (resource === "REPORTS" && action === "READ") return "REPORTS_READ";
  return null;
}

export async function can(resource: Resource, action: Action, actor: Actor, orgId?: string | null): Promise<boolean> {
  const policy = mapToPolicyAction(resource, action);
  if (!policy) return false;
  return hasPolicy(policy, actor, orgId);
}

export async function requireCan(resource: Resource, action: Action, actor: Actor, orgId?: string | null): Promise<void> {
  const ok = await can(resource, action, actor, orgId);
  if (!ok) throw new Error("Forbidden: insufficient permissions");
}

// ==============================
// Membership cache (TTL)
// ==============================
const MEMBERSHIP_TTL_MS = 30_000; // 30s
type MemCacheVal = { ok: boolean; expiresAt: number };
const membershipCache = new Map<string, MemCacheVal>();

function mcKey(userId: string, orgId: string) {
  return `${userId}:${orgId}`;
}

async function isMemberCached(userId: string, orgId: string): Promise<boolean> {
  const key = mcKey(userId, orgId);
  const hit = membershipCache.get(key);
  const now = Date.now();
  if (hit && hit.expiresAt > now) return hit.ok;
  const membership = await prisma.organizationMember.findFirst({ where: { organizationId: orgId, userId }, select: { id: true } });
  const ok = !!membership;
  membershipCache.set(key, { ok, expiresAt: now + MEMBERSHIP_TTL_MS });
  return ok;
}

export function invalidateMembershipCache(userId: string, orgId?: string) {
  if (orgId) {
    membershipCache.delete(mcKey(userId, orgId));
    return;
    }
  // Xoá tất cả key theo userId
  const prefix = `${userId}:`;
  for (const k of membershipCache.keys()) {
    if (k.startsWith(prefix)) membershipCache.delete(k);
  }
}
