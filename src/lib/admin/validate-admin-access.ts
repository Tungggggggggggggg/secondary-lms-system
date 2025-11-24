/**
 * Utility functions để validate admin access và permissions
 */

import { UserRole } from "@prisma/client";
import { ADMIN_ROLES } from "./admin-constants";
import { isSuperAdminRole as isSuperAdminUtil } from "../rbac/role-utils";

/**
 * Kiểm tra user có phải là admin không
 * @param role - User role
 * @returns True nếu là admin
 */
export function isAdmin(role: UserRole | string | null | undefined): boolean {
  if (!role) return false;
  return ADMIN_ROLES.includes(role as UserRole);
}

/**
 * Kiểm tra user có phải là super admin không
 * @param role - User role
 * @returns True nếu là super admin
 */
export function isSuperAdmin(
  role: UserRole | string | null | undefined
): boolean {
  return isSuperAdminUtil(role as string | null | undefined);
}

/**
 * Kiểm tra user có quyền truy cập admin dashboard không
 * @param role - User role
 * @returns True nếu có quyền truy cập
 */
export function canAccessAdmin(
  role: UserRole | string | null | undefined
): boolean {
  return isAdmin(role);
}

/**
 * Kiểm tra user có quyền quản lý users không (chỉ SUPER_ADMIN)
 * @param role - User role
 * @returns True nếu có quyền
 */
export function canManageUsers(
  role: UserRole | string | null | undefined
): boolean {
  return isSuperAdmin(role);
}

/**
 * Kiểm tra user có quyền quản lý system settings không (chỉ SUPER_ADMIN)
 * @param role - User role
 * @returns True nếu có quyền
 */
export function canManageSystemSettings(
  role: UserRole | string | null | undefined
): boolean {
  return isSuperAdmin(role);
}

/**
 * Kiểm tra user có quyền xem audit logs không
 * @param role - User role
 * @returns True nếu có quyền
 */
export function canViewAuditLogs(
  role: UserRole | string | null | undefined
): boolean {
  return isSuperAdmin(role);
}

/**
 * Kiểm tra user có quyền kiểm duyệt nội dung không (ADMIN và SUPER_ADMIN)
 * @param role - User role
 * @returns True nếu có quyền
 */
export function canModerateContent(
  role: UserRole | string | null | undefined
): boolean {
  return isAdmin(role);
}

/**
 * Kiểm tra user có quyền xem reports không (ADMIN và SUPER_ADMIN)
 * @param role - User role
 * @returns True nếu có quyền
 */
export function canViewReports(
  role: UserRole | string | null | undefined
): boolean {
  return isAdmin(role);
}

/**
 * Kiểm tra user có quyền quản lý organizations không (ADMIN và SUPER_ADMIN)
 * @param role - User role
 * @returns True nếu có quyền
 */
export function canManageOrganizations(
  role: UserRole | string | null | undefined
): boolean {
  return isAdmin(role);
}

/**
 * Lấy danh sách roles mà user có thể assign (dựa vào role của user hiện tại)
 * @param currentRole - Role của user hiện tại
 * @returns Array of assignable roles
 */
export function getAssignableRoles(
  currentRole: UserRole | string | null | undefined
): UserRole[] {
  if (isSuperAdmin(currentRole)) {
    return ["SUPER_ADMIN", "STAFF", "TEACHER", "STUDENT", "PARENT"];
  }
  if (isAdmin(currentRole)) {
    return ["TEACHER", "STUDENT", "PARENT"];
  }
  return [];
}

