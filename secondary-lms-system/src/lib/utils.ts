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

export default cn;
