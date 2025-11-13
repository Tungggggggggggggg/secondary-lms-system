/**
 * Types định nghĩa cho bulk operations
 * Hỗ trợ tạo lớp học hàng loạt với validation chuyên nghiệp
 */

import { UserRole } from "@prisma/client";

// ============================================
// Bulk User Creation Types
// ============================================

export interface BulkUserInput {
  email: string;
  fullname: string;
  role: UserRole;
  password?: string; // Tự động generate nếu không có
  existingUserId?: string; // ID của user có sẵn (không tạo mới)
  metadata?: Record<string, any>;
}

export interface BulkUserValidationError {
  row: number;
  field: string;
  message: string;
  value?: any;
}

export interface BulkUserResult {
  success: boolean;
  created?: {
    id: string;
    email: string;
    fullname: string;
    role: UserRole;
    generatedPassword?: string;
  };
  error?: string;
  warnings?: string[];
}

// ============================================
// Bulk Classroom Creation Types
// ============================================

export interface BulkClassroomInput {
  // Thông tin lớp học cơ bản
  name: string;
  description?: string;
  icon?: string;
  maxStudents?: number;
  code?: string; // Tự động generate nếu không có
  
  // Giáo viên
  teacherEmail?: string; // Nếu có sẵn
  teacherData?: {
    email: string;
    fullname: string;
    password?: string;
  };
  
  // Danh sách học sinh
  students: BulkUserInput[];
  
  // Metadata
  organizationId?: string;
  grade?: string;
  subject?: string;
  academicYear?: string;
}

export interface BulkClassroomValidationResult {
  isValid: boolean;
  errors: BulkUserValidationError[];
  warnings: string[];
  duplicates: {
    emails: string[];
  };
  summary: {
    totalStudents: number;
    newUsers: number;
    existingUsers: number;
    parentLinksToCreate: number;
  };
}

export interface BulkClassroomResult {
  success: boolean;
  classroom?: {
    id: string;
    name: string;
    code: string;
    teacherId: string;
  };
  teacher?: {
    id: string;
    email: string;
    fullname: string;
    isNew: boolean;
    generatedPassword?: string;
  };
  students: BulkUserResult[];
  parentLinks: {
    parentId: string;
    studentId: string;
    success: boolean;
    error?: string;
  }[];
  errors: string[];
  warnings: string[];
  summary: {
    totalProcessed: number;
    successCount: number;
    errorCount: number;
    warningCount: number;
    duration: number;
  };
}

// ============================================
// Progress Tracking Types
// ============================================

export interface BulkOperationProgress {
  id: string;
  type: 'BULK_CLASSROOM_CREATION';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  progress: {
    current: number;
    total: number;
    percentage: number;
  };
  currentStep: string;
  startedAt: Date;
  completedAt?: Date;
  result?: BulkClassroomResult;
  error?: string;
}

// ============================================
// CSV/Excel Import Types
// ============================================

export interface CSVImportColumn {
  key: string;
  label: string;
  required: boolean;
  type: 'string' | 'email' | 'number';
  validator?: (value: any) => boolean;
  transformer?: (value: any) => any;
}

export interface CSVImportResult {
  success: boolean;
  data: BulkUserInput[];
  errors: BulkUserValidationError[];
  warnings: string[];
  summary: {
    totalRows: number;
    validRows: number;
    errorRows: number;
    skippedRows: number;
  };
}

// ============================================
// Template Types
// ============================================

export interface ClassroomTemplate {
  id: string;
  name: string;
  description?: string;
  icon: string;
  maxStudents: number;
  grade?: string;
  subject?: string;
  defaultSettings: {
    allowStudentJoin: boolean;
    requireApproval: boolean;
    autoGeneratePasswords: boolean;
    sendWelcomeEmails: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface BulkOperationSettings {
  autoGeneratePasswords: boolean;
  sendWelcomeEmails: boolean;
  createParentLinks: boolean;
  allowDuplicateEmails: boolean;
  skipExistingUsers: boolean;
  dryRun: boolean; // Chỉ validate không tạo thật
}

// ============================================
// API Response Types
// ============================================

export interface BulkOperationApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: string[];
  warnings?: string[];
  meta?: {
    duration: number;
    timestamp: string;
    operationId: string;
  };
}

export type BulkClassroomApiResponse = BulkOperationApiResponse<BulkClassroomResult>;
export type BulkValidationApiResponse = BulkOperationApiResponse<BulkClassroomValidationResult>;
export type BulkProgressApiResponse = BulkOperationApiResponse<BulkOperationProgress>;
