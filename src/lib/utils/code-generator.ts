/**
 * Utility functions để tạo các mã code duy nhất
 * Sử dụng cho invitation codes, user codes, etc.
 */

/**
 * Tạo mã invitation ngẫu nhiên 8 ký tự
 * Format: ABC12345 (chữ hoa + số, loại bỏ các ký tự dễ nhầm lẫn)
 * 
 * @returns Mã invitation 8 ký tự
 */
export function generateInvitationCode(): string {
  // Loại bỏ I, O, 0, 1 để tránh nhầm lẫn khi đọc
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  
  for (let i = 0; i < 8; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    code += chars.charAt(randomIndex);
  }
  
  return code;
}

/**
 * Tạo mã user code theo format: PH2024001, HS2024001
 * 
 * @param role - Role của user (PARENT hoặc STUDENT)
 * @param sequence - Số thứ tự (1, 2, 3, ...)
 * @returns User code theo format
 */
export function generateUserCode(
  role: "PARENT" | "STUDENT",
  sequence: number
): string {
  const prefix = role === "PARENT" ? "PH" : "HS";
  const year = new Date().getFullYear();
  const paddedSequence = sequence.toString().padStart(3, "0");
  
  return `${prefix}${year}${paddedSequence}`;
}

/**
 * Validate invitation code format
 * 
 * @param code - Mã cần validate
 * @returns true nếu format hợp lệ
 */
export function isValidInvitationCode(code: string): boolean {
  // Phải có đúng 8 ký tự, chỉ chứa chữ hoa và số
  const regex = /^[A-Z0-9]{8}$/;
  return regex.test(code);
}

/**
 * Validate user code format
 * 
 * @param code - Mã cần validate
 * @returns true nếu format hợp lệ
 */
export function isValidUserCode(code: string): boolean {
  // Format: PH2024001 hoặc HS2024001
  const regex = /^(PH|HS)\d{7}$/;
  return regex.test(code);
}

/**
 * Parse user code để lấy thông tin
 * 
 * @param code - User code
 * @returns Object chứa role, year, sequence hoặc null nếu invalid
 */
export function parseUserCode(code: string): {
  role: "PARENT" | "STUDENT";
  year: number;
  sequence: number;
} | null {
  if (!isValidUserCode(code)) {
    return null;
  }
  
  const prefix = code.substring(0, 2);
  const year = parseInt(code.substring(2, 6));
  const sequence = parseInt(code.substring(6));
  
  return {
    role: prefix === "PH" ? "PARENT" : "STUDENT",
    year,
    sequence,
  };
}

/**
 * Format invitation code để dễ đọc
 * ABC12345 -> ABC1-2345
 * 
 * @param code - Mã invitation
 * @returns Mã đã format
 */
export function formatInvitationCode(code: string): string {
  if (code.length !== 8) return code;
  return `${code.substring(0, 4)}-${code.substring(4)}`;
}
