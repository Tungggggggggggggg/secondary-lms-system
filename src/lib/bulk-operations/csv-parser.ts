/**
 * CSV/Excel Parser cho bulk operations
 * Hỗ trợ parse và validate dữ liệu từ file CSV/Excel
 */

import type { AdminUserRole } from "@/lib/admin/admin-constants";
import { 
  BulkUserInput, 
  CSVImportColumn, 
  CSVImportResult, 
  BulkUserValidationError 
} from "@/types/bulk-operations";
import { validateBulkUser, sanitizeBulkUserInput } from "./validators";

// ============================================
// CSV Column Definitions
// ============================================

export const STUDENT_CSV_COLUMNS: CSVImportColumn[] = [
  {
    key: 'email',
    label: 'Email',
    required: true,
    type: 'email',
    validator: (value) => typeof value === 'string' && value.includes('@')
  },
  {
    key: 'fullname',
    label: 'Họ và tên',
    required: true,
    type: 'string',
    validator: (value) => typeof value === 'string' && value.trim().length >= 2
  },
  {
    key: 'password',
    label: 'Mật khẩu',
    required: false,
    type: 'string',
    validator: (value) => !value || (typeof value === 'string' && value.length >= 6)
  }
];

export const TEACHER_CSV_COLUMNS: CSVImportColumn[] = [
  {
    key: 'email',
    label: 'Email',
    required: true,
    type: 'email',
    validator: (value) => typeof value === 'string' && value.includes('@')
  },
  {
    key: 'fullname',
    label: 'Họ và tên',
    required: true,
    type: 'string',
    validator: (value) => typeof value === 'string' && value.trim().length >= 2
  },
  {
    key: 'password',
    label: 'Mật khẩu',
    required: false,
    type: 'string',
    validator: (value) => !value || (typeof value === 'string' && value.length >= 6)
  }
];

// ============================================
// CSV Parser Functions
// ============================================

/**
 * Parse CSV text thành array of objects
 */
export const parseCSVText = (csvText: string): Record<string, any>[] => {
  try {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV phải có ít nhất 2 dòng (header + data)');
    }

    // Parse header
    const headers = parseCSVLine(lines[0]);
    const data: Record<string, any>[] = [];

    // Parse data lines
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Skip empty lines

      const values = parseCSVLine(line);
      const row: Record<string, any> = {};

      headers.forEach((header, index) => {
        const value = values[index]?.trim() || '';
        row[header.toLowerCase().trim()] = value;
      });

      data.push(row);
    }

    return data;
  } catch (error) {
    console.error('[CSV_PARSER] Error parsing CSV:', error);
    throw new Error(`Lỗi parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Parse một dòng CSV với xử lý quotes
 */
const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i += 2;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      result.push(current);
      current = '';
      i++;
    } else {
      current += char;
      i++;
    }
  }

  result.push(current);
  return result;
};

/**
 * Map CSV data thành BulkUserInput với validation
 */
export const mapCSVToUsers = (
  csvData: Record<string, any>[],
  role: AdminUserRole = 'STUDENT',
  columns: CSVImportColumn[] = STUDENT_CSV_COLUMNS
): CSVImportResult => {
  const errors: BulkUserValidationError[] = [];
  const warnings: string[] = [];
  const users: BulkUserInput[] = [];
  let validRows = 0;
  let errorRows = 0;
  let skippedRows = 0;

  csvData.forEach((row, index) => {
    const rowNumber = index + 2; // +2 vì index 0-based và có header
    let hasError = false;
    const user: Partial<BulkUserInput> = { role };

    // Map từng column
    columns.forEach(column => {
      const rawValue = row[column.key.toLowerCase()] || row[column.label.toLowerCase()] || '';
      let value = rawValue;

      // Apply transformer nếu có
      if (column.transformer && value) {
        try {
          value = column.transformer(value);
        } catch (error) {
          errors.push({
            row: rowNumber,
            field: column.key,
            message: `Lỗi transform dữ liệu: ${error instanceof Error ? error.message : 'Unknown error'}`,
            value: rawValue
          });
          hasError = true;
          return;
        }
      }

      // Check required fields
      if (column.required && (!value || value.toString().trim() === '')) {
        errors.push({
          row: rowNumber,
          field: column.key,
          message: `${column.label} là bắt buộc`,
          value: value
        });
        hasError = true;
        return;
      }

      // Apply validator nếu có
      if (column.validator && value && !column.validator(value)) {
        errors.push({
          row: rowNumber,
          field: column.key,
          message: `${column.label} không hợp lệ`,
          value: value
        });
        hasError = true;
        return;
      }

      // Assign value
      if (value && value.toString().trim() !== '') {
        (user as any)[column.key] = value;
      }
    });

    // Skip nếu row rỗng hoàn toàn
    const hasAnyData = Object.values(row).some(v => v && v.toString().trim() !== '');
    if (!hasAnyData) {
      skippedRows++;
      return;
    }

    if (hasError) {
      errorRows++;
      return;
    }

    // Sanitize và validate user
    const sanitizedUser = sanitizeBulkUserInput(user as BulkUserInput);
    const userErrors = validateBulkUser(sanitizedUser, rowNumber);

    if (userErrors.length > 0) {
      errors.push(...userErrors);
      errorRows++;
    } else {
      users.push(sanitizedUser);
      validRows++;
    }
  });

  // Generate warnings
  if (skippedRows > 0) {
    warnings.push(`Đã bỏ qua ${skippedRows} dòng trống`);
  }

  if (errorRows > 0) {
    warnings.push(`${errorRows} dòng có lỗi sẽ không được xử lý`);
  }

  return {
    success: errors.length === 0,
    data: users,
    errors,
    warnings,
    summary: {
      totalRows: csvData.length,
      validRows,
      errorRows,
      skippedRows
    }
  };
};

// ============================================
// Template Generation Functions
// ============================================

/**
 * Tạo CSV template cho download
 */
export const generateCSVTemplate = (
  columns: CSVImportColumn[],
  includeExample: boolean = true
): string => {
  // Header row
  const headers = columns.map(col => col.label);
  let csv = headers.join(',') + '\n';

  // Example row nếu cần
  if (includeExample) {
    const exampleRow = columns.map(col => {
      switch (col.key) {
        case 'email':
          return 'hocsinh@example.com';
        case 'fullname':
          return 'Nguyễn Văn A';
        case 'studentId':
          return 'HS001';
        case 'parentEmail':
          return 'phuhuynh@example.com';
        case 'grade':
          return '12A1';
        case 'password':
          return 'password123';
        default:
          return '';
      }
    });
    csv += exampleRow.join(',') + '\n';
  }

  return csv;
};

/**
 * Tạo CSV template cho students
 */
export const generateStudentCSVTemplate = (includeExample: boolean = true): string => {
  return generateCSVTemplate(STUDENT_CSV_COLUMNS, includeExample);
};

/**
 * Tạo CSV template cho teachers
 */
export const generateTeacherCSVTemplate = (includeExample: boolean = true): string => {
  return generateCSVTemplate(TEACHER_CSV_COLUMNS, includeExample);
};

// ============================================
// File Processing Functions
// ============================================

/**
 * Process file upload và return parsed data
 */
export const processUploadedFile = async (
  file: File,
  role: AdminUserRole = 'STUDENT'
): Promise<CSVImportResult> => {
  try {
    // Validate file type
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!allowedTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.csv')) {
      throw new Error('Chỉ hỗ trợ file CSV (.csv) hoặc Excel (.xls, .xlsx)');
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error('File không được vượt quá 5MB');
    }

    // Read file content
    const text = await file.text();
    
    // Parse CSV
    const csvData = parseCSVText(text);
    
    // Map to users
    const columns = role === 'TEACHER' ? TEACHER_CSV_COLUMNS : STUDENT_CSV_COLUMNS;
    return mapCSVToUsers(csvData, role, columns);

  } catch (error) {
    console.error('[CSV_PARSER] Error processing file:', error);
    return {
      success: false,
      data: [],
      errors: [{
        row: 0,
        field: 'file',
        message: error instanceof Error ? error.message : 'Lỗi xử lý file',
        value: file.name
      }],
      warnings: [],
      summary: {
        totalRows: 0,
        validRows: 0,
        errorRows: 1,
        skippedRows: 0
      }
    };
  }
};

// ============================================
// Utility Functions
// ============================================

/**
 * Convert array of objects thành CSV string
 */
export const arrayToCSV = (data: Record<string, any>[]): string => {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];

  data.forEach(row => {
    const values = headers.map(header => {
      const value = row[header] || '';
      // Escape quotes và wrap trong quotes nếu có comma
      if (value.toString().includes(',') || value.toString().includes('"')) {
        return `"${value.toString().replace(/"/g, '""')}"`;
      }
      return value.toString();
    });
    csvRows.push(values.join(','));
  });

  return csvRows.join('\n');
};
