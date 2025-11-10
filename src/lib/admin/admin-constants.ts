/**
 * Constants cho Admin Dashboard
 */

import { UserRole } from "@prisma/client";

// ============================================
// Roles & Permissions
// ============================================

export const USER_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "TEACHER",
  "STUDENT",
  "PARENT",
];

export const ADMIN_ROLES: UserRole[] = ["SUPER_ADMIN", "ADMIN"];

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  TEACHER: "Giáo viên",
  STUDENT: "Học sinh",
  PARENT: "Phụ huynh",
};

export const ROLE_COLORS: Record<UserRole, string> = {
  SUPER_ADMIN: "text-red-600 bg-red-50",
  ADMIN: "text-blue-600 bg-blue-50",
  TEACHER: "text-purple-600 bg-purple-50",
  STUDENT: "text-green-600 bg-green-50",
  PARENT: "text-orange-600 bg-orange-50",
};

// ============================================
// Navigation Menu
// ============================================

export interface AdminNavItem {
  id: string;
  label: string;
  href: string;
  icon: string; // lucide-react icon name
  roles: UserRole[];
  children?: AdminNavItem[];
}

export const SUPER_ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    id: "overview",
    label: "Tổng quan",
    href: "/dashboard/admin/overview",
    icon: "LayoutDashboard",
    roles: ["SUPER_ADMIN"],
  },
  {
    id: "system",
    label: "Hệ thống",
    href: "/dashboard/admin/system",
    icon: "Server",
    roles: ["SUPER_ADMIN"],
  },
  {
    id: "users",
    label: "Người dùng",
    href: "/dashboard/admin/users",
    icon: "Users",
    roles: ["SUPER_ADMIN"],
  },
  {
    id: "audit",
    label: "Audit Logs",
    href: "/dashboard/admin/audit",
    icon: "FileText",
    roles: ["SUPER_ADMIN"],
  },
  {
    id: "settings",
    label: "Cài đặt",
    href: "/dashboard/admin/system/settings",
    icon: "Settings",
    roles: ["SUPER_ADMIN"],
  },
];

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    id: "overview",
    label: "Tổng quan",
    href: "/dashboard/admin/overview",
    icon: "LayoutDashboard",
    roles: ["ADMIN"],
  },
  {
    id: "organizations",
    label: "Tổ chức",
    href: "/dashboard/admin/org",
    icon: "Building2",
    roles: ["ADMIN"],
  },
  {
    id: "members",
    label: "Thành viên",
    href: "/dashboard/admin/org/members",
    icon: "Users",
    roles: ["ADMIN"],
  },
  {
    id: "moderation",
    label: "Kiểm duyệt",
    href: "/dashboard/admin/moderation",
    icon: "ShieldCheck",
    roles: ["ADMIN"],
  },
  {
    id: "reports",
    label: "Báo cáo",
    href: "/dashboard/admin/reports",
    icon: "BarChart3",
    roles: ["ADMIN"],
  },
  {
    id: "settings",
    label: "Cài đặt",
    href: "/dashboard/admin/settings",
    icon: "Settings",
    roles: ["ADMIN"],
  },
];

// ============================================
// Table Constants
// ============================================

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// ============================================
// Date Formats
// ============================================

export const DATE_FORMATS = {
  display: "dd/MM/yyyy",
  displayWithTime: "dd/MM/yyyy HH:mm",
  displayFull: "dd/MM/yyyy HH:mm:ss",
  iso: "yyyy-MM-dd",
  isoWithTime: "yyyy-MM-dd HH:mm:ss",
} as const;

// ============================================
// Settings Keys
// ============================================

export const SETTINGS_KEYS = {
  CONTENT_PREMODERATION: "content.premoderation",
  SYSTEM_MAINTENANCE: "system.maintenance",
  UPLOAD_MAX_SIZE_MB: "upload.maxSizeMB",
  SYSTEM_NAME: "system.name",
  SYSTEM_EMAIL: "system.email",
} as const;

// ============================================
// Audit Actions
// ============================================

export const AUDIT_ACTIONS = {
  USER_CREATE: "USER_CREATE",
  USER_UPDATE: "USER_UPDATE",
  USER_DELETE: "USER_DELETE",
  USER_ROLE_CHANGE: "USER_ROLE_CHANGE",
  USER_PASSWORD_RESET: "USER_PASSWORD_RESET",
  ORG_CREATE: "ORG_CREATE",
  ORG_UPDATE: "ORG_UPDATE",
  ORG_DELETE: "ORG_DELETE",
  ORG_MEMBER_ADD: "ORG_MEMBER_ADD",
  ORG_MEMBER_REMOVE: "ORG_MEMBER_REMOVE",
  SETTINGS_UPDATE: "SETTINGS_UPDATE",
  MODERATION_APPROVE: "MODERATION_APPROVE",
  MODERATION_REJECT: "MODERATION_REJECT",
  PARENT_STUDENT_CREATE: "PARENT_STUDENT_CREATE",
  PARENT_STUDENT_UPDATE: "PARENT_STUDENT_UPDATE",
  PARENT_STUDENT_DELETE: "PARENT_STUDENT_DELETE",
} as const;

// ============================================
// Moderation Status
// ============================================

export const MODERATION_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;

export const MODERATION_STATUS_LABELS: Record<
  keyof typeof MODERATION_STATUS,
  string
> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
};

export const MODERATION_STATUS_COLORS: Record<
  keyof typeof MODERATION_STATUS,
  string
> = {
  PENDING: "text-yellow-600 bg-yellow-50",
  APPROVED: "text-green-600 bg-green-50",
  REJECTED: "text-red-600 bg-red-50",
};

// ============================================
// Chart Colors
// ============================================

export const CHART_COLORS = {
  primary: "#8b5cf6", // violet-500
  secondary: "#a78bfa", // violet-400
  success: "#10b981", // green-500
  warning: "#f59e0b", // amber-500
  danger: "#ef4444", // red-500
  info: "#3b82f6", // blue-500
  purple: "#9333ea", // purple-600
  pink: "#ec4899", // pink-500
  indigo: "#6366f1", // indigo-500
  teal: "#14b8a6", // teal-500
} as const;

export const CHART_COLOR_PALETTE = [
  CHART_COLORS.primary,
  CHART_COLORS.secondary,
  CHART_COLORS.success,
  CHART_COLORS.warning,
  CHART_COLORS.danger,
  CHART_COLORS.info,
  CHART_COLORS.purple,
  CHART_COLORS.pink,
  CHART_COLORS.indigo,
  CHART_COLORS.teal,
] as const;

// ============================================
// Export Constants
// ============================================

export const EXPORT_FORMATS = {
  CSV: "csv",
  EXCEL: "xlsx",
  JSON: "json",
} as const;

