import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { isStaffRole } from "@/lib/rbac/role-utils";

// Helper: lấy orgId từ query/header; ưu tiên query -> header -> null
export function resolveOrgId(req: NextRequest): string | null {
  const url = new URL(req.url);
  const qp = url.searchParams.get("orgId") || url.searchParams.get("organizationId");
  const header = req.headers.get("x-org-id");
  const cookie = req.cookies.get("x-org-id")?.value || null;
  return (qp || header || cookie || null) as string | null;
}

// Bảo đảm có session, trả về user rút gọn cho guards
export async function requireSession(req: NextRequest): Promise<{ id: string; role: string }> {
  const token = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET });
  if (!token || !token.id) {
    throw new Error("Unauthorized: missing session");
  }
  const role = (token.role as string) || "";
  return { id: token.id as string, role };
}

// Chỉ cho SUPER_ADMIN
export function requireSuperAdmin(user: { id: string; role: string }): void {
  if (user.role !== "SUPER_ADMIN") {
    throw new Error("Forbidden: super admin only");
  }
}

// ADMIN/SUPER_ADMIN truy cập tài nguyên theo org; SUPER_ADMIN bỏ qua kiểm tra membership
export async function requireOrgAdmin(user: { id: string; role: string }, orgId?: string | null): Promise<string> {
  if (!orgId) throw new Error("Missing orgId");
  if (user.role === "SUPER_ADMIN") return orgId;
  if (!isStaffRole(user.role)) throw new Error("Forbidden: admin only");
  const member = await prisma.organizationMember.findFirst({ where: { organizationId: orgId, userId: user.id }, select: { id: true } });
  if (!member) throw new Error("Forbidden: not a member of organization");
  return orgId;
}

// Giữ API cũ (compat)
export async function requireOrgAccess(req: NextRequest, user: { id: string; role: string }, orgId?: string | null): Promise<string> {
  return requireOrgAdmin(user, orgId);
}

