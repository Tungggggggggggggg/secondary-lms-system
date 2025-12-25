import * as XLSX from "xlsx";

export type ExcelCellValue = string | number | boolean | Date | null | undefined;

export type ExcelRow = ExcelCellValue[];

function normalizeCellValue(val: ExcelCellValue): string | number | boolean | Date | null {
  if (val == null) return null;
  return val;
}

function ensureXlsxExt(name: string): string {
  return name.toLowerCase().endsWith(".xlsx") ? name : `${name}.xlsx`;
}

function downloadArrayBuffer(arrayBuffer: ArrayBuffer, filename: string): void {
  const blob = new Blob([arrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", ensureXlsxExt(filename));
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Tạo filename export theo định dạng: `{prefix}-{timestamp}.{extension}`.
 *
 * @param prefix - Tiền tố tên file.
 * @param extension - Phần mở rộng (mặc định: xlsx).
 * @returns Tên file đã format.
 */
export function generateFilename(prefix: string = "export", extension: string = "xlsx"): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, -5);
  return `${prefix}-${timestamp}.${extension}`;
}

export type ExportToXlsxOptions = {
  sheetName?: string;
};

/**
 * Tạo file Excel (.xlsx) dưới dạng ArrayBuffer từ `headers` + `rows`.
 *
 * @param headers - Danh sách tiêu đề cột.
 * @param rows - Dữ liệu theo từng dòng.
 * @param options - Tuỳ chọn sheetName.
 * @returns ArrayBuffer của file .xlsx.
 */
export function toXlsxArrayBuffer(
  headers: string[],
  rows: ExcelRow[],
  options?: ExportToXlsxOptions
): ArrayBuffer {
  const sheetName = options?.sheetName?.trim() || "Sheet1";
  const aoa: ExcelCellValue[][] = [headers, ...rows].map((r) => r.map(normalizeCellValue));
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
}

/**
 * Export ra file Excel (.xlsx) và trigger download (client-side).
 *
 * @param filename - Tên file (có/không có .xlsx).
 * @param headers - Danh sách tiêu đề cột.
 * @param rows - Dữ liệu theo từng dòng.
 * @param options - Tuỳ chọn sheetName.
 */
export function exportToXlsx(
  filename: string,
  headers: string[],
  rows: ExcelRow[],
  options?: ExportToXlsxOptions
): void {
  const arrayBuffer = toXlsxArrayBuffer(headers, rows, options);
  downloadArrayBuffer(arrayBuffer, filename);
}

/**
 * Export danh sách object sang Excel (.xlsx) và trigger download.
 *
 * @param data - Mảng object.
 * @param filename - Tên file (có/không có .xlsx).
 * @param headers - Map key->label để đổi tên cột.
 * @param options - Tuỳ chọn sheetName.
 */
export function exportObjectsToXlsx<T extends Record<string, unknown>>(
  data: T[],
  filename: string = "export.xlsx",
  headers?: Record<keyof T, string>,
  options?: ExportToXlsxOptions
): void {
  if (data.length === 0) {
    exportToXlsx(filename, [], [], options);
    return;
  }

  const keys = Object.keys(data[0]) as Array<keyof T>;
  const headerLabels = keys.map((key) => (headers && headers[key] ? String(headers[key]) : String(key)));
  const rows: ExcelRow[] = data.map((row) => keys.map((k) => row[k] as ExcelCellValue));

  exportToXlsx(filename, headerLabels, rows, options);
}
