export type ClassValue =
	| string
	| number
	| null
	| undefined
	| { [key: string]: boolean | undefined | null }
	| ClassValue[];

export function cn(...inputs: ClassValue[]): string {
	const result: string[] = [];

	inputs.forEach((input) => {
		if (!input) return;

		if (typeof input === 'string' || typeof input === 'number') {
			result.push(String(input));
			return;
		}

		if (Array.isArray(input)) {
			result.push(cn(...input));
			return;
		}

		if (typeof input === 'object') {
							Object.keys(input).forEach((key) => {
								const map = input as Record<string, unknown>;
								const val = map[key];
								if (val) result.push(key);
							});
			return;
		}
	});

	return result.join(' ');
}

/**
 * Tạo mã xác nhận ngẫu nhiên gồm 6 số
 */
export function generateResetToken(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Tạo mã lớp học ngẫu nhiên gồm chữ và số (6 ký tự)
 */
export function generateClassroomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Loại bỏ các ký tự dễ nhầm lẫn
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default cn;

// ===== VALIDATION UTILITIES =====

/**
 * Validate ID parameter (assignmentId, submissionId, etc.)
 * @param id - ID cần validate
 * @param fieldName - Tên field để hiển thị trong error message
 * @returns object với isValid và errorMessage
 */
export function validateId(id: string | undefined | null, fieldName: string = "ID") {
  if (!id || id === "undefined" || id === "null" || id.trim() === "") {
    return {
      isValid: false,
      errorMessage: `${fieldName} không hợp lệ: "${id}"`
    };
  }
  return {
    isValid: true,
    errorMessage: null
  };
}

/**
 * Validate grade (0-10)
 * @param grade - Điểm cần validate
 * @returns object với isValid và errorMessage
 */
export function validateGrade(grade: number | undefined | null) {
  if (grade === undefined || grade === null) {
    return {
      isValid: false,
      errorMessage: "Điểm không được để trống"
    };
  }
  
  if (typeof grade !== 'number' || isNaN(grade)) {
    return {
      isValid: false,
      errorMessage: `Điểm phải là số: "${grade}"`
    };
  }
  
  if (grade < 0 || grade > 10) {
    return {
      isValid: false,
      errorMessage: `Điểm phải từ 0-10: "${grade}"`
    };
  }
  
  return {
    isValid: true,
    errorMessage: null
  };
}

/**
 * Validate pagination parameters
 * @param page - Số trang
 * @param limit - Số item per page
 * @returns object với isValid, errorMessage và normalized values
 */
export function validatePagination(page?: string | number, limit?: string | number) {
  let normalizedPage = 1;
  let normalizedLimit = 50;
  
  // Validate page
  if (page !== undefined) {
    const pageNum = typeof page === 'string' ? parseInt(page) : page;
    if (isNaN(pageNum) || pageNum < 1) {
      return {
        isValid: false,
        errorMessage: `Số trang không hợp lệ: "${page}"`
      };
    }
    normalizedPage = pageNum;
  }
  
  // Validate limit
  if (limit !== undefined) {
    const limitNum = typeof limit === 'string' ? parseInt(limit) : limit;
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return {
        isValid: false,
        errorMessage: `Limit không hợp lệ (1-100): "${limit}"`
      };
    }
    normalizedLimit = limitNum;
  }
  
  return {
    isValid: true,
    errorMessage: null,
    page: normalizedPage,
    limit: normalizedLimit
  };
}

// ===== LOGGING UTILITIES =====

/**
 * Generate request ID cho logging
 * @returns string - Random request ID
 */
export function generateRequestId(): string {
  return Math.random().toString(36).substring(7);
}

/**
 * Log error với format chuẩn
 * @param requestId - Request ID
 * @param context - Context của error (function name, API endpoint, etc.)
 * @param error - Error object hoặc message
 * @param additionalData - Dữ liệu bổ sung để debug
 */
export function logError(
  requestId: string,
  context: string,
  error: unknown,
  additionalData?: Record<string, any>
) {
  console.error(`[${requestId}] [ERROR] ${context}:`, {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    ...additionalData
  });
}

/**
 * Log info với format chuẩn
 * @param requestId - Request ID
 * @param context - Context của log
 * @param message - Log message
 * @param data - Dữ liệu bổ sung
 */
export function logInfo(
  requestId: string,
  context: string,
  message: string,
  data?: Record<string, any>
) {
  console.log(`[${requestId}] [INFO] ${context}: ${message}`, data || {});
}
