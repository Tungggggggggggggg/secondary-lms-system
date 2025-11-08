/**
 * Utility functions để format numbers cho Admin Dashboard
 */

/**
 * Format number với thousand separators
 * @param num - Number để format
 * @param decimals - Số chữ số thập phân (default: 0)
 * @returns Formatted number string
 */
export function formatNumber(
  num: number | null | undefined,
  decimals: number = 0
): string {
  if (num === null || num === undefined || isNaN(num)) return "-";

  return new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * Format number thành currency (VND)
 * @param num - Number để format
 * @returns Formatted currency string
 */
export function formatCurrency(num: number | null | undefined): string {
  if (num === null || num === undefined || isNaN(num)) return "-";

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(num);
}

/**
 * Format number thành file size (bytes to KB, MB, GB, etc.)
 * @param bytes - Bytes
 * @param decimals - Số chữ số thập phân (default: 2)
 * @returns Formatted file size string
 */
export function formatFileSize(
  bytes: number | null | undefined,
  decimals: number = 2
): string {
  if (bytes === null || bytes === undefined || isNaN(bytes)) return "-";
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return (
    parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + " " + sizes[i]
  );
}

/**
 * Format number thành percentage
 * @param num - Number (0-100)
 * @param decimals - Số chữ số thập phân (default: 1)
 * @returns Formatted percentage string
 */
export function formatPercentage(
  num: number | null | undefined,
  decimals: number = 1
): string {
  if (num === null || num === undefined || isNaN(num)) return "-";

  return new Intl.NumberFormat("vi-VN", {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num / 100);
}

/**
 * Format number với compact notation (1K, 1M, 1B, etc.)
 * @param num - Number để format
 * @param decimals - Số chữ số thập phân (default: 1)
 * @returns Formatted compact number string
 */
export function formatCompactNumber(
  num: number | null | undefined,
  decimals: number = 1
): string {
  if (num === null || num === undefined || isNaN(num)) return "-";

  return new Intl.NumberFormat("vi-VN", {
    notation: "compact",
    compactDisplay: "short",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * Format number với leading zeros
 * @param num - Number để format
 * @param length - Độ dài mong muốn (default: 2)
 * @returns Formatted number string với leading zeros
 */
export function formatWithLeadingZeros(
  num: number | null | undefined,
  length: number = 2
): string {
  if (num === null || num === undefined || isNaN(num)) return "-";

  return num.toString().padStart(length, "0");
}

