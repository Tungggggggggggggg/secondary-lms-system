"use client";

import React from "react";
import { DateTimePopover } from "@/components/shared";

interface EssayScheduleSectionProps {
  openAt?: Date;
  dueDate?: Date;
  onChange: (next: { openAt?: Date; dueDate?: Date }) => void;
  className?: string;
}

export default function EssayScheduleSection({ openAt, dueDate, onChange, className }: EssayScheduleSectionProps) {
  const formatDateTime = (d?: Date) =>
    d ? d.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "--";

  const now = new Date();
  const minOpen = now;
  const minDue = openAt ? new Date(openAt.getTime() + 60_000) : now;
  const maxOpen = dueDate ? new Date(dueDate.getTime()) : undefined;

  return (
    <div className={className}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <DateTimePopover
            label="Thời gian mở bài"
            value={openAt}
            onChange={(d) => onChange({ openAt: d, dueDate })}
            min={minOpen}
            max={maxOpen}
          />
          {openAt && (
            <div className="text-xs text-gray-500">✓ {formatDateTime(openAt)}</div>
          )}
        </div>

        <div className="space-y-1">
          <DateTimePopover
            label="Hạn nộp bài"
            value={dueDate}
            onChange={(d) => onChange({ openAt, dueDate: d })}
            required
            min={minDue}
          />
          {dueDate && (
            <div className="text-xs text-gray-500">✓ {formatDateTime(dueDate)}</div>
          )}
        </div>
      </div>
    </div>
  );
}
