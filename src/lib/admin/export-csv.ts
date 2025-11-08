/**
 * Utility functions để export data to CSV
 */

/**
 * Convert array of objects to CSV string
 * @param data - Array of objects
 * @param headers - Optional custom headers (key: label mapping)
 * @returns CSV string
 */
export function convertToCSV<T extends Record<string, unknown>>(
  data: T[],
  headers?: Record<keyof T, string>
): string {
  if (data.length === 0) return "";

  // Get all unique keys from data
  const keys = Object.keys(data[0]) as Array<keyof T>;

  // Build CSV header
  const headerLabels = keys.map((key) => {
    if (headers && headers[key]) {
      return headers[key];
    }
    return String(key);
  });

  // Escape CSV values (handle commas, quotes, newlines)
  const escapeCSV = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    const str = String(value);
    // If contains comma, quote, or newline, wrap in quotes and escape quotes
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Build CSV rows
  const rows = data.map((row) => {
    return keys.map((key) => escapeCSV(row[key])).join(",");
  });

  // Combine header and rows
  return [headerLabels.join(","), ...rows].join("\n");
}

/**
 * Download CSV file
 * @param csvContent - CSV string content
 * @param filename - Filename (default: "export.csv")
 */
export function downloadCSV(csvContent: string, filename: string = "export.csv"): void {
  // Create blob with CSV content
  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  }); // BOM for UTF-8 Excel compatibility

  // Create download link
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  // Trigger download
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export data to CSV file
 * @param data - Array of objects
 * @param filename - Filename (default: "export.csv")
 * @param headers - Optional custom headers (key: label mapping)
 */
export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  filename: string = "export.csv",
  headers?: Record<keyof T, string>
): void {
  const csvContent = convertToCSV(data, headers);
  downloadCSV(csvContent, filename);
}

/**
 * Generate filename with timestamp
 * @param prefix - Filename prefix
 * @param extension - File extension (default: "csv")
 * @returns Filename with timestamp
 */
export function generateFilename(
  prefix: string = "export",
  extension: string = "csv"
): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, -5);
  return `${prefix}-${timestamp}.${extension}`;
}

