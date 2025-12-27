"use client";

import React, { useState } from "react";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import MonthYearSwitcher from "./MonthYearSwitcher";

interface Props {
  value?: Date;
  onChange: (d?: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function toInputDate(d?: Date): string {
  if (!d) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromInputDate(value: string, base?: Date): Date | undefined {
  if (!value) return undefined;
  const [y, m, dd] = value.split("-").map((s) => parseInt(s, 10));
  if (!y || !m || !dd) return undefined;
  const hours = base?.getHours?.() ?? 8;
  const minutes = base?.getMinutes?.() ?? 0;
  const d = new Date(y, m - 1, dd, hours, minutes, 0, 0);
  return d;
}

const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const MONTHS = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
];

export default function CalendarGrid({ value, onChange, minDate, maxDate, className }: Props) {
  const today = new Date();
  const [displayDate, setDisplayDate] = useState(value || today);
  const year = displayDate.getFullYear();
  const month = displayDate.getMonth();
  
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const days: (number | null)[] = Array(firstDay).fill(null);
  
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const isDateDisabled = (day: number): boolean => {
    const d = new Date(year, month, day);
    if (minDate && d < minDate) return true;
    if (maxDate && d > maxDate) return true;
    return false;
  };

  const isDateSelected = (day: number): boolean => {
    if (!value) return false;
    return (
      value.getFullYear() === year &&
      value.getMonth() === month &&
      value.getDate() === day
    );
  };

  const isDateToday = (day: number): boolean => {
    return (
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === day
    );
  };

  // Month/year selection handled by MonthYearSwitcher

  const handleDayClick = (day: number) => {
    if (isDateDisabled(day)) return;
    const d = new Date(year, month, day);
    const hours = value?.getHours?.() ?? 8;
    const minutes = value?.getMinutes?.() ?? 0;
    d.setHours(hours);
    d.setMinutes(minutes);
    onChange(d);
  };

  const handleToday = () => {
    const t = new Date();
    const hours = value?.getHours?.() ?? 8;
    const minutes = value?.getMinutes?.() ?? 0;
    t.setHours(hours);
    t.setMinutes(minutes);
    onChange(t);
    setDisplayDate(t);
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="h-5 w-5 text-blue-600" />
        <label className="text-sm font-semibold text-gray-800">Chọn ngày</label>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-4 md:p-5">
        {/* Header */}
        <div className="mb-4">
          <MonthYearSwitcher value={displayDate} onChange={setDisplayDate} minDate={minDate} maxDate={maxDate} />
        </div>

        {/* Weekdays */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {WEEKDAYS.map((day) => (
            <div key={day} className="text-center text-xs font-semibold text-gray-600 py-1.5">
              {day}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, idx) => {
            const isDisabled = day ? isDateDisabled(day) : true;
            const isSelected = day ? isDateSelected(day) : false;
            const isToday = day ? isDateToday(day) : false;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => day && handleDayClick(day)}
                disabled={isDisabled}
                className={cn(
                  "h-10 md:h-11 rounded-lg font-medium text-base transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  day === null ? "invisible" : "",
                  day !== null && !isDisabled ? "cursor-pointer" : "",
                  day !== null && isDisabled ? "text-gray-300 cursor-not-allowed" : "",
                  day !== null && !isDisabled && !isSelected && !isToday ? "text-gray-700 hover:bg-blue-200" : "",
                  day !== null && isToday && !isSelected ? "bg-blue-200 text-blue-700 font-bold" : "",
                  day !== null && isSelected ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold shadow-md" : ""
                )}
              >
                {day}
              </button>
            );
          })}
        </div>

        {/* Quick action */}
        <div className="mt-3 pt-3 border-t border-blue-200">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleToday}
            className="w-full text-xs"
          >
            Hôm nay
          </Button>
        </div>
      </div>

      {/* Selected date display */}
      {value && (
        <div className="text-center text-sm font-medium text-gray-700">
          ✓ {value.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}
        </div>
      )}
    </div>
  );
}
