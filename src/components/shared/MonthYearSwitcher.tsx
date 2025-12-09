"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  value: Date;
  onChange: (d: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
}

const MONTHS = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
];

function clampToBounds(d: Date, min?: Date, max?: Date) {
  let nd = new Date(d);
  if (min && nd < min) nd = new Date(min);
  if (max && nd > max) nd = new Date(max);
  return nd;
}

export default function MonthYearSwitcher({ value, onChange, minDate, maxDate, className }: Props) {
  const year = value.getFullYear();
  const month = value.getMonth();

  const go = (deltaMonths: number) => {
    const d = new Date(value);
    d.setMonth(d.getMonth() + deltaMonths);
    onChange(clampToBounds(d, minDate, maxDate));
  };

  const setMonth = (m: number) => {
    const d = new Date(value);
    d.setMonth(m);
    onChange(clampToBounds(d, minDate, maxDate));
  };

  const setYear = (y: number) => {
    const d = new Date(value);
    d.setFullYear(y);
    onChange(clampToBounds(d, minDate, maxDate));
  };

  // Year range: current year ± 50
  const years: number[] = [];
  for (let y = year - 50; y <= year + 50; y++) years.push(y);

  return (
    <div className={cn("flex items-center justify-between", className)} aria-label="Chọn tháng năm">
      <button
        type="button"
        onClick={() => go(-1)}
        className="p-2 hover:bg-blue-200 rounded-lg transition-colors text-gray-700"
        aria-label="Tháng trước"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-2">
        <select
          className="h-8 rounded-md border border-blue-200 bg-white px-2 text-sm"
          value={month}
          onChange={(e) => setMonth(parseInt(e.target.value, 10))}
          aria-label="Tháng"
        >
          {MONTHS.map((m, idx) => (
            <option value={idx} key={m}>{m}</option>
          ))}
        </select>
        <select
          className="h-8 rounded-md border border-blue-200 bg-white px-2 text-sm"
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value, 10))}
          aria-label="Năm"
        >
          {years.map((y) => (
            <option value={y} key={y}>{y}</option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={() => go(1)}
        className="p-2 hover:bg-blue-200 rounded-lg transition-colors text-gray-700"
        aria-label="Tháng sau"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
