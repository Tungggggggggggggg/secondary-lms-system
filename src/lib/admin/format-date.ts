/**
 * Utility functions để format dates cho Admin Dashboard
 */

/**
 * Format date thành string hiển thị
 * @param date - Date object hoặc string
 * @param format - Format pattern (default: "dd/MM/yyyy HH:mm")
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string | null | undefined,
  format: "short" | "medium" | "long" | "full" = "medium"
): string {
  if (!date) return "-";

  const d = typeof date === "string" ? new Date(date) : date;

  if (isNaN(d.getTime())) return "-";

  const options: Record<"short" | "medium" | "long" | "full", Intl.DateTimeFormatOptions> = {
    short: {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
    medium: {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
    long: {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    },
    full: {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    },
  };

  return new Intl.DateTimeFormat("vi-VN", options[format]).format(d);
}

/**
 * Format date thành relative time (e.g., "2 giờ trước", "3 ngày trước")
 * @param date - Date object hoặc string
 * @returns Relative time string
 */
export function formatRelativeTime(
  date: Date | string | null | undefined
): string {
  if (!date) return "-";

  const d = typeof date === "string" ? new Date(date) : date;

  if (isNaN(d.getTime())) return "-";

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffSec < 60) return "Vừa xong";
  if (diffMin < 60) return `${diffMin} phút trước`;
  if (diffHour < 24) return `${diffHour} giờ trước`;
  if (diffDay < 7) return `${diffDay} ngày trước`;
  if (diffWeek < 4) return `${diffWeek} tuần trước`;
  if (diffMonth < 12) return `${diffMonth} tháng trước`;
  return `${diffYear} năm trước`;
}

/**
 * Format date range
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Formatted date range string
 */
export function formatDateRange(
  startDate: Date | string | null | undefined,
  endDate: Date | string | null | undefined
): string {
  if (!startDate || !endDate) return "-";

  const start = typeof startDate === "string" ? new Date(startDate) : startDate;
  const end = typeof endDate === "string" ? new Date(endDate) : endDate;

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return "-";

  const startStr = formatDate(start, "short");
  const endStr = formatDate(end, "short");

  return `${startStr} - ${endStr}`;
}

/**
 * Get date range options (Today, Yesterday, Last 7 days, Last 30 days, etc.)
 */
export function getDateRangeOptions(): Array<{
  label: string;
  value: string;
  startDate: Date;
  endDate: Date;
}> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const last7Days = new Date(today);
  last7Days.setDate(last7Days.getDate() - 7);
  const last30Days = new Date(today);
  last30Days.setDate(last30Days.getDate() - 30);
  const last90Days = new Date(today);
  last90Days.setDate(last90Days.getDate() - 90);
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  return [
    {
      label: "Hôm nay",
      value: "today",
      startDate: today,
      endDate: now,
    },
    {
      label: "Hôm qua",
      value: "yesterday",
      startDate: yesterday,
      endDate: today,
    },
    {
      label: "7 ngày qua",
      value: "last7days",
      startDate: last7Days,
      endDate: now,
    },
    {
      label: "30 ngày qua",
      value: "last30days",
      startDate: last30Days,
      endDate: now,
    },
    {
      label: "90 ngày qua",
      value: "last90days",
      startDate: last90Days,
      endDate: now,
    },
    {
      label: "Tháng này",
      value: "thisMonth",
      startDate: thisMonth,
      endDate: now,
    },
    {
      label: "Tháng trước",
      value: "lastMonth",
      startDate: lastMonth,
      endDate: lastMonthEnd,
    },
  ];
}

/**
 * Format date thành ISO string cho API
 * @param date - Date object hoặc string
 * @returns ISO string
 */
export function formatDateToISO(
  date: Date | string | null | undefined
): string | null {
  if (!date) return null;

  const d = typeof date === "string" ? new Date(date) : date;

  if (isNaN(d.getTime())) return null;

  return d.toISOString();
}

