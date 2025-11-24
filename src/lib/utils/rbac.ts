import { prisma } from "@/lib/prisma";
import { isAdminRole as isAdmin, isSuperAdminRole as isSuperAdmin } from "@/lib/rbac/role-utils";
// Các helper RBAC cơ bản cho vai trò hệ thống (đồng bộ với rbac/policy)

export { isAdmin, isSuperAdmin };

export function assertRole<T extends string>(role: string | undefined | null, ...allowed: T[]): asserts role is T {
  if (!role || !allowed.includes(role as T)) {
    throw new Error(`Forbidden: role ${role ?? "(none)"} not in [${allowed.join(", ")}]`);
  }
}

// Placeholder cho kiểm tra phạm vi theo Organization hoặc Scope tài nguyên.
// Khi triển khai Organization, hàm này sẽ kiểm tra user có thuộc orgId hay không.
export async function assertOrgScope(userId: string, orgId: string): Promise<void> {
  const membership = await prisma.organizationMember.findFirst({
    where: { organizationId: orgId, userId },
    select: { id: true },
  });
  if (!membership) {
    throw new Error("Forbidden: not a member of organization");
  }
}


