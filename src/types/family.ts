/**
 * Types cho hệ thống liên kết phụ huynh-học sinh
 */

// ============================================
// Base Types
// ============================================

export type LinkStatus = "PENDING" | "ACTIVE" | "REJECTED" | "EXPIRED";
export type LinkRequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";

export interface UserBasicInfo {
  id: string;
  email: string;
  fullname: string;
  role: string;
}

// ============================================
// Parent-Student Link Types
// ============================================

export interface ParentStudentLink {
  id: string;
  parentId: string;
  studentId: string;
  status: LinkStatus;
  parentConfirmedAt: string | null;
  studentConfirmedAt: string | null;
  initiatedBy: string | null;
  metadata: any;
  createdAt: string;
  updatedAt: string;
  parent: UserBasicInfo;
  student: UserBasicInfo;
}

// ============================================
// Invitation Types
// ============================================

export interface ParentStudentInvitation {
  id: string;
  code: string;
  status: LinkRequestStatus;
  studentId: string;
  parentId: string | null;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
  student: UserBasicInfo;
  parent?: UserBasicInfo | null;
}

export interface CreateInvitationInput {
  expiresInDays?: number;
}

export interface AcceptInvitationInput {
  code: string;
}

// ============================================
// Link Request Types
// ============================================

export interface ParentStudentLinkRequest {
  id: string;
  status: LinkRequestStatus;
  parentId: string;
  studentId: string;
  message: string | null;
  createdAt: string;
  respondedAt: string | null;
  expiresAt: string;
  parent: UserBasicInfo;
  student: UserBasicInfo;
}

export interface CreateLinkRequestInput {
  studentId: string;
  message?: string;
}

export interface RespondToLinkRequestInput {
  requestId: string;
  action: "approve" | "reject";
  reason?: string;
}

// ============================================
// Search Types
// ============================================

export interface StudentSearchParams {
  query?: string;
  limit?: number;
  skip?: number;
}

export interface StudentSearchResult {
  id: string;
  email: string;
  fullname: string;
  role: string;
  // Thông tin bổ sung
  classrooms?: Array<{
    id: string;
    name: string;
  }>;
  hasExistingRequest?: boolean;
  isLinked?: boolean;
}

// ============================================
// API Response Types
// ============================================

export interface InvitationListResponse {
  success: boolean;
  items: ParentStudentInvitation[];
  total: number;
}

export interface LinkRequestListResponse {
  success: boolean;
  items: ParentStudentLinkRequest[];
  total: number;
}

export interface ParentStudentLinkListResponse {
  success: boolean;
  items: ParentStudentLink[];
  total: number;
}

export interface StudentSearchResponse {
  success: boolean;
  items: StudentSearchResult[];
  total: number;
}

export interface ValidationResponse {
  valid: boolean;
  error?: string;
  invitation?: ParentStudentInvitation;
}

// ============================================
// Statistics Types
// ============================================

export interface FamilyStatistics {
  totalLinkedParents: number;
  totalLinkedStudents: number;
  pendingInvitations: number;
  pendingRequests: number;
  expiredInvitations: number;
  rejectedRequests: number;
}
