import { prisma } from "@/lib/prisma";

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

  // ADMIN: giới hạn trong phạm vi tổ chức
  if (actor.role === "ADMIN") {
    const orgScopedActions: PolicyAction[] = [
      "ORG_READ",
      "USER_READ",
      "USER_WRITE",
      "AUDIT_READ",
      "MODERATION_REVIEW",
      "REPORTS_READ",
    ];
    if (!orgScopedActions.includes(action)) return false;
    if (!orgId) return false;
    const membership = await prisma.organizationMember.findFirst({ where: { organizationId: orgId, userId: actor.id }, select: { id: true } });
    return !!membership;
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
