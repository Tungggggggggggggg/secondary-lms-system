export function isSuperAdminRole(role?: string | null): boolean {
  return role === "SUPER_ADMIN";
}

export function isAdminRole(role?: string | null): boolean {
  return role === "STAFF";
}

export function isStaffRole(role?: string | null): boolean {
  return role === "STAFF";
}
