/**
 * Type definitions cho Admin Dashboard
 */

import { UserRole } from "@prisma/client";

// ============================================
// User Types
// ============================================

export interface AdminUser {
  id: string;
  email: string;
  fullname: string;
  role: UserRole;
  createdAt: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface AdminUserListItem extends AdminUser {
  organizationMemberships?: Array<{
    id: string;
    organizationId: string;
  }>;
}

export interface CreateUserInput {
  email: string;
  fullname: string;
  password: string;
  role: UserRole;
  organizationId?: string;
}

export interface UpdateUserInput {
  id: string;
  email?: string;
  fullname?: string;
  role?: UserRole;
}

// ============================================
// Organization Types
// ============================================

export interface AdminOrganization {
  id: string;
  name: string;
  slug: string | null;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
  membersCount?: number;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  roleInOrg: string | null;
  createdAt: string;
  user: AdminUser;
}

export interface CreateOrganizationInput {
  name: string;
  slug?: string;
}

export interface UpdateOrganizationInput {
  id: string;
  name?: string;
  slug?: string;
  status?: "ACTIVE" | "INACTIVE";
}

// ============================================
// Audit Log Types
// ============================================

export interface AuditLog {
  id: string;
  actorId: string;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  organizationId: string | null;
  createdAt: string;
}

export interface AuditLogFilter {
  orgId?: string;
  actorId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  cursor?: string;
}

// ============================================
// Moderation Types
// ============================================

export interface ModerationItem {
  id: string;
  type: "announcement" | "comment";
  content: string;
  authorId: string;
  authorName?: string;
  createdAt: string;
  organizationId?: string;
  classroomId?: string;
  announcementId?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  moderationReason?: string;
}

export interface ModerationQueueFilter {
  type?: "announcement" | "comment";
  orgId?: string;
  status?: "PENDING" | "APPROVED" | "REJECTED";
  limit?: number;
  cursor?: string;
}

// ============================================
// Reports Types
// ============================================

export interface ReportsOverview {
  users: number;
  classrooms: number;
  courses: number;
  assignments: number;
  submissions: number;
  announcements: number;
  comments: number;
  pending: number;
}

export interface ReportsUsage {
  anns: Array<{
    createdAt: string;
    _count: { createdAt: number };
  }>;
  cmts: Array<{
    createdAt: string;
    _count: { createdAt: number };
  }>;
}

export interface ReportsGrowth {
  date: string;
  count: number;
}

export interface ReportsFilter {
  orgId?: string;
  startDate?: string;
  endDate?: string;
}

// ============================================
// Settings Types
// ============================================

export interface SystemSetting {
  key: string;
  value: unknown;
  updatedAt: string;
}

export interface SettingsCategory {
  id: string;
  name: string;
  description?: string;
  settings: SystemSetting[];
}

// ============================================
// Pagination Types
// ============================================

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor?: string | null;
  total?: number;
}

export interface PaginationParams {
  limit?: number;
  cursor?: string | null;
  search?: string | null;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
  meta?: {
    durationMs?: number;
    requestId?: string;
    resetAt?: string;
  };
}

export interface ApiError {
  ok: false;
  error: string;
  meta?: {
    durationMs?: number;
    requestId?: string;
  };
}

// ============================================
// Table Types
// ============================================

export type SortDirection = "asc" | "desc";

export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (value: unknown, row: T) => React.ReactNode;
}

export interface TableSort<T> {
  column: keyof T | string;
  direction: SortDirection;
}

export interface TableFilter {
  key: string;
  value: string | number | boolean;
  operator?: "equals" | "contains" | "gt" | "lt" | "gte" | "lte";
}

// ============================================
// Stats Types
// ============================================

export interface StatsCardProps {
  title: string;
  value: number | string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    direction: "up" | "down" | "neutral";
  };
  description?: string;
  color?: "default" | "primary" | "success" | "warning" | "danger" | "info";
}

// ============================================
// Parent-Student Types (Removed - Moved to family.ts)
// ============================================

// ============================================
// Chart Types
// ============================================

export interface ChartDataPoint {
  label: string;
  value: number;
  date?: string;
}

export interface LineChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    borderColor?: string;
    backgroundColor?: string;
  }>;
}

export interface BarChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
  }>;
}

export interface PieChartData {
  labels: string[];
  datasets: Array<{
    data: number[];
    backgroundColor?: string[];
  }>;
}

