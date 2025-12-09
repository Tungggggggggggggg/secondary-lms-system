"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  baseDate?: Date;
  onSelect: (d: Date) => void;
  className?: string;
  min?: Date;
  max?: Date;
}

function clampToBounds(d: Date, min?: Date, max?: Date) {
  let nd = new Date(d);
  if (min && nd < min) nd = new Date(min);
  if (max && nd > max) nd = new Date(max);
  return nd;
}

function setHM(base: Date, h: number, m: number) {
  const d = new Date(base);
  d.setHours(h);
  d.setMinutes(m);
  d.setSeconds(0);
  d.setMilliseconds(0);
  return d;
}

export default function TimeQuickChips({ baseDate, onSelect, className, min, max }: Props) {
  const today = baseDate ?? new Date();

  const absoluteTimes: Array<{ label: string; h: number; m: number }> = [
    { label: "08:00", h: 8, m: 0 },
    { label: "12:00", h: 12, m: 0 },
    { label: "14:00", h: 14, m: 0 },
    { label: "19:00", h: 19, m: 0 },
    { label: "23:59", h: 23, m: 59 }
  ];

  const relatives: Array<{ label: string; minutes: number }> = [
    { label: "+15’", minutes: 15 },
    { label: "+1h", minutes: 60 },
    { label: "+1d", minutes: 1440 },
    { label: "+1w", minutes: 10080 }
  ];

  const selectAbsolute = (h: number, m: number) => {
    const d = clampToBounds(setHM(today, h, m), min, max);
    onSelect(d);
  };

  const selectRelative = (deltaMin: number) => {
    const base = baseDate ?? new Date();
    const d = new Date(base);
    d.setMinutes(d.getMinutes() + deltaMin);
    const nd = clampToBounds(d, min, max);
    onSelect(nd);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-gray-700">Giờ nhanh</div>
        <div className="text-[10px] text-gray-400">Tăng tốc thao tác</div>
      </div>
      <div className="flex flex-wrap gap-2">
        {absoluteTimes.map((t) => (
          <Button
            key={t.label}
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={() => selectAbsolute(t.h, t.m)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2">
        <div className="text-xs font-semibold text-gray-700">Tương đối</div>
      </div>
      <div className="flex flex-wrap gap-2">
        {relatives.map((r) => (
          <Button
            key={r.label}
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={() => selectRelative(r.minutes)}
          >
            {r.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
