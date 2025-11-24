/**
 * Validators cho bulk operations
 * Validation chuyên nghiệp với error handling chi tiết
 */

import { UserRole } from "@prisma/client";
import { 
  BulkUserInput, 
  BulkClassroomInput, 
  BulkUserValidationError, 
  BulkClassroomValidationResult 
} from "@/types/bulk-operations";

// ============================================
// Email và String Validators
// ============================================

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim().toLowerCase());
};

export const validateFullname = (fullname: string): boolean => {
  return fullname.trim().length >= 2 && fullname.trim().length <= 100;
};

export const validatePassword = (password: string): boolean => {
  return password.length >= 6 && password.length <= 50;
};

export const validateClassroomCode = (code: string): boolean => {
  const codeRegex = /^[A-Z0-9]{4,10}$/;
  return codeRegex.test(code.trim().toUpperCase());
};

export const validateStudentId = (studentId: string): boolean => {
  // Có thể customize theo format ID học sinh của trường
  const studentIdRegex = /^[A-Z0-9]{6,15}$/;
  return studentIdRegex.test(studentId.trim().toUpperCase());
};

// ============================================
// User Role Validators
// ============================================

export const validateUserRole = (role: string): role is UserRole => {
  const validRoles: UserRole[] = ['STAFF', 'TEACHER', 'STUDENT', 'PARENT', 'SUPER_ADMIN'];
  return validRoles.includes(role as UserRole);
};

export const validateRoleForBulkCreation = (role: UserRole): boolean => {
  // Chỉ cho phép tạo TEACHER, STUDENT, PARENT trong bulk operations
  const allowedRoles: UserRole[] = ['TEACHER', 'STUDENT', 'PARENT'];
  return allowedRoles.includes(role);
};

// ============================================
// Single User Validator
// ============================================

export const validateBulkUser = (
  user: BulkUserInput, 
  rowIndex: number
): BulkUserValidationError[] => {
  const errors: BulkUserValidationError[] = [];

  // Validate email
  if (!user.email) {
    errors.push({
      row: rowIndex,
      field: 'email',
      message: 'Email là bắt buộc',
      value: user.email
    });
  } else if (!validateEmail(user.email)) {
    errors.push({
      row: rowIndex,
      field: 'email',
      message: 'Email không hợp lệ',
      value: user.email
    });
  }

  // Validate fullname
  if (!user.fullname) {
    errors.push({
      row: rowIndex,
      field: 'fullname',
      message: 'Họ tên là bắt buộc',
      value: user.fullname
    });
  } else if (!validateFullname(user.fullname)) {
    errors.push({
      row: rowIndex,
      field: 'fullname',
      message: 'Họ tên phải từ 2-100 ký tự',
      value: user.fullname
    });
  }

  // Validate role
  if (!user.role) {
    errors.push({
      row: rowIndex,
      field: 'role',
      message: 'Vai trò là bắt buộc',
      value: user.role
    });
  } else if (!validateUserRole(user.role)) {
    errors.push({
      row: rowIndex,
      field: 'role',
      message: 'Vai trò không hợp lệ',
      value: user.role
    });
  } else if (!validateRoleForBulkCreation(user.role)) {
    errors.push({
      row: rowIndex,
      field: 'role',
      message: 'Vai trò không được phép tạo hàng loạt',
      value: user.role
    });
  }

  // Validate password nếu có
  if (user.password && !validatePassword(user.password)) {
    errors.push({
      row: rowIndex,
      field: 'password',
      message: 'Mật khẩu phải từ 6-50 ký tự',
      value: '***'
    });
  }

  // Bỏ validation cho parentEmail và studentId vì đã không sử dụng


  return errors;
};

// ============================================
// Bulk Classroom Validator
// ============================================

export const validateBulkClassroom = async (
  input: BulkClassroomInput
): Promise<BulkClassroomValidationResult> => {
  const errors: BulkUserValidationError[] = [];
  const warnings: string[] = [];
  const duplicates = {
    emails: [] as string[]
  };

  // Validate thông tin lớp học cơ bản
  if (!input.name || input.name.trim().length < 2) {
    errors.push({
      row: 0,
      field: 'name',
      message: 'Tên lớp học phải có ít nhất 2 ký tự',
      value: input.name
    });
  }

  if (input.maxStudents && (input.maxStudents < 1 || input.maxStudents > 100)) {
    errors.push({
      row: 0,
      field: 'maxStudents',
      message: 'Số lượng học sinh tối đa phải từ 1-100',
      value: input.maxStudents
    });
  }

  if (input.code && !validateClassroomCode(input.code)) {
    errors.push({
      row: 0,
      field: 'code',
      message: 'Mã lớp học không hợp lệ (4-10 ký tự, chữ hoa và số)',
      value: input.code
    });
  }

  // Validate teacher data
  if (input.teacherData) {
    if (!validateEmail(input.teacherData.email)) {
      errors.push({
        row: 0,
        field: 'teacherEmail',
        message: 'Email giáo viên không hợp lệ',
        value: input.teacherData.email
      });
    }

    if (!validateFullname(input.teacherData.fullname)) {
      errors.push({
        row: 0,
        field: 'teacherFullname',
        message: 'Họ tên giáo viên không hợp lệ',
        value: input.teacherData.fullname
      });
    }

    if (input.teacherData.password && !validatePassword(input.teacherData.password)) {
      errors.push({
        row: 0,
        field: 'teacherPassword',
        message: 'Mật khẩu giáo viên phải từ 6-50 ký tự',
        value: '***'
      });
    }
  } else if (input.teacherEmail && !validateEmail(input.teacherEmail)) {
    errors.push({
      row: 0,
      field: 'teacherEmail',
      message: 'Email giáo viên không hợp lệ',
      value: input.teacherEmail
    });
  }

  // Validate students
  if (!input.students || input.students.length === 0) {
    errors.push({
      row: 0,
      field: 'students',
      message: 'Danh sách học sinh không được để trống',
      value: input.students?.length || 0
    });
  } else {
    const emailSet = new Set<string>();

    input.students.forEach((student, index) => {
      // Validate từng student
      const studentErrors = validateBulkUser(student, index + 1);
      errors.push(...studentErrors);

      // Check duplicate emails
      const normalizedEmail = student.email?.toLowerCase().trim();
      if (normalizedEmail) {
        if (emailSet.has(normalizedEmail)) {
          duplicates.emails.push(normalizedEmail);
        } else {
          emailSet.add(normalizedEmail);
        }
      }

      // Bỏ check duplicate student IDs vì không còn sử dụng studentId
    });

    // Kiểm tra giới hạn số lượng học sinh
    const maxStudents = input.maxStudents || 30;
    if (input.students.length > maxStudents) {
      warnings.push(`Số lượng học sinh (${input.students.length}) vượt quá giới hạn (${maxStudents})`);
    }
  }

  // Tính toán summary
  const totalStudents = input.students?.length || 0;
  const newUsers = totalStudents; // Sẽ được tính chính xác hơn khi check database
  const existingUsers = 0; // Sẽ được tính khi check database
  const parentLinksToCreate = 0; // Sẽ được tính dựa trên số lượng parent emails

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    duplicates,
    summary: {
      totalStudents,
      newUsers,
      existingUsers,
      parentLinksToCreate
    }
  };
};

// ============================================
// Utility Functions
// ============================================

export const generateSecurePassword = (length: number = 8): string => {
  const charset = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
};

export const generateClassroomCode = (): string => {
  const charset = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return code;
};

export const normalizeEmail = (email: string): string => {
  return email.trim().toLowerCase();
};

export const normalizeFullname = (fullname: string): string => {
  return fullname.trim().replace(/\s+/g, ' ');
};

export const sanitizeBulkUserInput = (user: BulkUserInput): BulkUserInput => {
  return {
    ...user,
    email: user.email ? normalizeEmail(user.email) : '',
    fullname: user.fullname ? normalizeFullname(user.fullname) : '',
    password: user.password ? user.password.trim() : undefined,
    existingUserId: user.existingUserId ? user.existingUserId.trim() : undefined,
    metadata: user.metadata ? { ...user.metadata } : undefined
  };
};
