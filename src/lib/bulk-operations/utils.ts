/**
 * Utility functions cho Bulk Operations
 * Các hàm tiện ích và helper functions
 */

import { BulkUserInput, BulkClassroomResult } from "@/types/bulk-operations";

// ============================================
// Data Processing Utils
// ============================================

/**
 * Chuyển đổi danh sách user thành CSV string
 */
export const usersToCSV = (users: BulkUserInput[]): string => {
  const headers = ['Email', 'Họ và tên', 'Mật khẩu'];
  const csvRows = [headers.join(',')];

  users.forEach(user => {
    const row = [
      user.email || '',
      user.fullname || '',
      user.password || ''
    ];
    
    // Escape commas and quotes
    const escapedRow = row.map(field => {
      if (field.includes(',') || field.includes('"')) {
        return `"${field.replace(/"/g, '""')}"`;
      }
      return field;
    });
    
    csvRows.push(escapedRow.join(','));
  });

  return csvRows.join('\n');
};

/**
 * Tạo file CSV và trigger download
 */
export const downloadCSV = (csvContent: string, filename: string): void => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

/**
 * Export login credentials as text file
 */
export const exportLoginCredentials = (result: BulkClassroomResult, classroomName: string): void => {
  let content = `=== THÔNG TIN ĐĂNG NHẬP LỚP HỌC ===\n\n`;
  content += `Lớp học: ${classroomName}\n`;
  content += `Mã lớp: ${result.classroom?.code || 'N/A'}\n`;
  content += `Ngày tạo: ${new Date().toLocaleDateString('vi-VN')}\n\n`;

  // Teacher credentials
  if (result.teacher) {
    content += `=== GIÁO VIÊN ===\n`;
    content += `Họ tên: ${result.teacher.fullname}\n`;
    content += `Email: ${result.teacher.email}\n`;
    if (result.teacher.generatedPassword) {
      content += `Mật khẩu: ${result.teacher.generatedPassword}\n`;
    }
    content += `Trạng thái: ${result.teacher.isNew ? 'Tài khoản mới' : 'Tài khoản có sẵn'}\n\n`;
  }

  // Students credentials
  content += `=== HỌC SINH (${result.students.filter(s => s.success).length}) ===\n`;
  result.students.forEach((student, index) => {
    if (student.success && student.created) {
      content += `${index + 1}. ${student.created.fullname}\n`;
      content += `   Email: ${student.created.email}\n`;
      if (student.created.generatedPassword) {
        content += `   Mật khẩu: ${student.created.generatedPassword}\n`;
      }
      content += `\n`;
    }
  });

  // Parent links
  const successfulParentLinks = result.parentLinks.filter(link => link.success);
  if (successfulParentLinks.length > 0) {
    content += `=== LIÊN KẾT PHỤ HUYNH (${successfulParentLinks.length}) ===\n`;
    successfulParentLinks.forEach((link, index) => {
      content += `${index + 1}. Parent ID: ${link.parentId} - Student ID: ${link.studentId}\n`;
    });
    content += `\n`;
  }

  // Errors
  if (result.errors.length > 0) {
    content += `=== LỖI (${result.errors.length}) ===\n`;
    result.errors.forEach((error, index) => {
      content += `${index + 1}. ${error}\n`;
    });
    content += `\n`;
  }

  // Statistics
  content += `=== THỐNG KÊ ===\n`;
  content += `Tổng số xử lý: ${result.summary.totalProcessed}\n`;
  content += `Thành công: ${result.summary.successCount}\n`;
  content += `Lỗi: ${result.summary.errorCount}\n`;
  content += `Cảnh báo: ${result.summary.warningCount}\n`;
  content += `Thời gian xử lý: ${Math.round(result.summary.duration / 1000)}s\n`;

  // Download as text file
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${classroomName.replace(/[^a-zA-Z0-9]/g, '_')}_login_info.txt`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// ============================================
// Validation Utils
// ============================================

/**
 * Kiểm tra email hợp lệ
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

/**
 * Kiểm tra mật khẩu mạnh
 */
export const isStrongPassword = (password: string): boolean => {
  // Ít nhất 8 ký tự, có chữ hoa, chữ thường, số
  const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return strongPasswordRegex.test(password);
};

/**
 * Tạo mật khẩu ngẫu nhiên an toàn
 */
export const generateSecurePassword = (length: number = 8): string => {
  const lowercase = 'abcdefghijkmnpqrstuvwxyz';
  const uppercase = 'ABCDEFGHJKMNPQRSTUVWXYZ';
  const numbers = '23456789';
  const symbols = '@#$%&*';
  
  const allChars = lowercase + uppercase + numbers + symbols;
  let password = '';
  
  // Đảm bảo có ít nhất 1 ký tự từ mỗi loại
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  
  // Điền phần còn lại
  for (let i = 3; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Trộn ngẫu nhiên
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

/**
 * Tạo mã lớp học ngẫu nhiên
 */
export const generateClassroomCode = (): string => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

// ============================================
// Format Utils
// ============================================

/**
 * Format thời gian duration
 */
export const formatDuration = (milliseconds: number): string => {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
};

/**
 * Format số lượng với đơn vị
 */
export const formatCount = (count: number, singular: string, plural: string): string => {
  return `${count} ${count === 1 ? singular : plural}`;
};

/**
 * Format file size
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// ============================================
// Array Utils
// ============================================

/**
 * Loại bỏ duplicate emails
 */
export const removeDuplicateEmails = (users: BulkUserInput[]): BulkUserInput[] => {
  const seen = new Set<string>();
  return users.filter(user => {
    const email = user.email.toLowerCase().trim();
    if (seen.has(email)) {
      return false;
    }
    seen.add(email);
    return true;
  });
};

/**
 * Nhóm users theo role
 */
export const groupUsersByRole = (users: BulkUserInput[]): Record<string, BulkUserInput[]> => {
  return users.reduce((groups, user) => {
    const role = user.role || 'STUDENT';
    if (!groups[role]) {
      groups[role] = [];
    }
    groups[role].push(user);
    return groups;
  }, {} as Record<string, BulkUserInput[]>);
};

/**
 * Sắp xếp users theo tên
 */
export const sortUsersByName = (users: BulkUserInput[]): BulkUserInput[] => {
  return [...users].sort((a, b) => {
    const nameA = a.fullname.toLowerCase().trim();
    const nameB = b.fullname.toLowerCase().trim();
    return nameA.localeCompare(nameB, 'vi');
  });
};

// ============================================
// Progress Utils
// ============================================

/**
 * Tính phần trăm hoàn thành
 */
export const calculateProgress = (current: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((current / total) * 100);
};

/**
 * Estimate thời gian còn lại
 */
export const estimateTimeRemaining = (
  startTime: Date, 
  current: number, 
  total: number
): number => {
  if (current === 0) return 0;
  
  const elapsed = Date.now() - startTime.getTime();
  const rate = current / elapsed; // items per millisecond
  const remaining = total - current;
  
  return remaining / rate;
};

// ============================================
// Local Storage Utils
// ============================================

const STORAGE_KEY = 'bulk_operations_history';

/**
 * Lưu operation history vào localStorage
 */
export const saveOperationHistory = (result: BulkClassroomResult): void => {
  try {
    const history = getOperationHistory();
    const newEntry = {
      id: Date.now().toString(),
      classroomName: result.classroom?.name || 'Unknown',
      classroomCode: result.classroom?.code || '',
      studentsCount: result.summary.successCount,
      errorsCount: result.summary.errorCount,
      duration: result.summary.duration,
      createdAt: new Date().toISOString(),
    };
    
    const updatedHistory = [newEntry, ...history.slice(0, 9)]; // Keep last 10
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
  } catch (error) {
    console.error('Error saving operation history:', error);
  }
};

/**
 * Lấy operation history từ localStorage
 */
export const getOperationHistory = (): any[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error getting operation history:', error);
    return [];
  }
};

/**
 * Xóa operation history
 */
export const clearOperationHistory = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing operation history:', error);
  }
};
