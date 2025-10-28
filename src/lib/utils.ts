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
