"use client";

import React from "react";
import { DateTimePopover } from "@/components/shared";
import { ScheduleTimelineCard } from "@/components/shared";

interface ScheduleSectionProps {
  openAt?: Date;
  lockAt?: Date;
  onChange: (next: { openAt?: Date; lockAt?: Date }) => void;
  timeLimitMinutes: number;
  className?: string;
}

function addMinutes(date: Date, minutes: number) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() + minutes);
  return d;
}

export default function ScheduleSection({ openAt, lockAt, onChange, timeLimitMinutes, className }: ScheduleSectionProps) {
  const fixByTimeLimit = () => {
    if (!openAt) return;
    onChange({ openAt, lockAt: addMinutes(openAt, timeLimitMinutes + 5) });
  };

  const formatDateTime = (d?: Date) =>
    d ? d.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "--";

  const now = new Date();
  const minOpen = now;
  const minLock = openAt ? new Date(openAt.getTime() + timeLimitMinutes * 60_000) : now;
  const maxOpen = lockAt ? new Date(lockAt.getTime()) : undefined;

  return (
    <div className={className}>
      {/* Timeline Card - chỉ hiển thị khi đã có đủ khoảng thời gian */}
      {openAt && lockAt && (
        <ScheduleTimelineCard
          openAt={openAt}
          lockAt={lockAt}
          timeLimitMinutes={timeLimitMinutes}
          onFixDuration={fixByTimeLimit}
          className="mb-6"
        />
      )}

      {/* DateTime Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <DateTimePopover
            label="Thời gian mở bài"
            value={openAt}
            onChange={(d) => onChange({ openAt: d, lockAt })}
            min={minOpen}
            max={maxOpen}
          />
          {openAt && (
            <div className="text-xs text-gray-500">✓ {formatDateTime(openAt)}</div>
          )}
        </div>

        <div className="space-y-1">
          <DateTimePopover
            label="Thời gian đóng bài"
            value={lockAt}
            onChange={(d) => onChange({ openAt, lockAt: d })}
            required
            min={minLock}
          />
          {lockAt && (
            <div className="text-xs text-gray-500">✓ {formatDateTime(lockAt)}</div>
          )}
        </div>
      </div>
    </div>
  );
}
