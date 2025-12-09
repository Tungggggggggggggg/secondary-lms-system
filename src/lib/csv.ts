export type CsvRow = (string | number | null | undefined)[];

// Simple CSV export with explicit headers + rows (kept for backward compatibility)
export function exportToCsv(
  filename: string,
  headers: string[],
  rows: CsvRow[]
): void {
  const escape = (val: string | number | null | undefined) => {
    if (val == null) return "";
    const s = String(val);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? '"' + s.replace(/"/g, '""') + '"'
      : s;
  };
  const csv = [headers, ...rows].map(r => r.map(escape).join(',')).join('\n');
  downloadCSV(csv, ensureCsvExt(filename));
}

// Richer utilities (from admin/export-csv), unified here
export function convertToCSV<T extends Record<string, unknown>>(
  data: T[],
  headers?: Record<keyof T, string>
): string {
  if (data.length === 0) return "";
  const keys = Object.keys(data[0]) as Array<keyof T>;
  const headerLabels = keys.map((key) => (headers && headers[key]) ? headers[key] : String(key));
  const escapeCSV = (value: unknown): string => {
    if (value == null) return "";
    const str = String(value);
    return (str.includes(',') || str.includes('"') || str.includes('\n'))
      ? `"${str.replace(/"/g, '""')}"`
      : str;
  };
  const rows = data.map(row => keys.map(k => escapeCSV(row[k])).join(','));
  return [headerLabels.join(','), ...rows].join('\n');
}

export function downloadCSV(csvContent: string, filename: string = "export.csv"): void {
  // Add BOM for UTF-8 Excel compatibility
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", ensureCsvExt(filename));
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  filename: string = "export.csv",
  headers?: Record<keyof T, string>
): void {
  const csvContent = convertToCSV(data, headers);
  downloadCSV(csvContent, filename);
}

export function generateFilename(prefix: string = "export", extension: string = "csv"): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, -5);
  return `${prefix}-${timestamp}.${extension}`;
}

function ensureCsvExt(name: string): string {
  return name.toLowerCase().endsWith('.csv') ? name : `${name}.csv`;
}
