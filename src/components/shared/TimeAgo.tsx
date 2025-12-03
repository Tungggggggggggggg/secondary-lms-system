"use client";

interface TimeAgoProps {
  date: Date | string;
  short?: boolean;
}

export default function TimeAgo({ date, short = false }: TimeAgoProps) {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);

  if (short) {
    if (diffSecs < 60) return "vừa xong";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    if (diffWeeks < 4) return `${diffWeeks}w`;
    return `${Math.floor(diffDays / 30)}mo`;
  }

  if (diffSecs < 60) return "Vừa xong";
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays === 1) return "1 ngày trước";
  if (diffDays < 7) return `${diffDays} ngày trước`;
  if (diffWeeks === 1) return "1 tuần trước";
  if (diffWeeks < 4) return `${diffWeeks} tuần trước`;
  return `${Math.floor(diffDays / 30)} tháng trước`;
}
