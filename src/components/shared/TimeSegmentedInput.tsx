"use client";

import React from "react";
import { ChevronUp, ChevronDown, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  value?: Date;
  onChange: (d?: Date) => void;
  className?: string;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function TimeSpinner({ 
  value, 
  onChange, 
  max, 
  label,
  aria 
}: { 
  value: number; 
  onChange: (v: number) => void; 
  max: number; 
  label: string;
  aria: string;
}) {
  const handleIncrement = () => onChange(clamp(value + 1, 0, max));
  const handleDecrement = () => onChange(clamp(value - 1, 0, max));
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseInt(e.target.value || "0", 10);
    if (!Number.isNaN(v)) onChange(clamp(v, 0, max));
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const step = e.shiftKey ? 5 : 1;
    if (e.key === "ArrowUp") {
      e.preventDefault();
      onChange(clamp(value + step, 0, max));
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      onChange(clamp(value - step, 0, max));
    }
  };
  const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    // Ngăn lăn chuột làm thay đổi giá trị ngoài ý muốn (error prevention)
    e.preventDefault();
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={handleIncrement}
        className="p-1 rounded-md hover:bg-blue-100 text-gray-600 hover:text-blue-600 transition-colors"
        aria-label={`Tăng ${aria}`}
      >
        <ChevronUp className="h-5 w-5" />
      </button>
      <input
        type="number"
        min={0}
        max={max}
        value={String(value).padStart(2, "0")}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onWheel={handleWheel}
        className={cn(
          "w-16 h-14 text-center text-2xl font-bold rounded-lg",
          "border-2 border-gray-200 transition-all duration-200",
          "focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200",
          "hover:border-gray-300"
        )}
        aria-label={aria}
      />
      <button
        type="button"
        onClick={handleDecrement}
        className="p-1 rounded-md hover:bg-blue-100 text-gray-600 hover:text-blue-600 transition-colors"
        aria-label={`Giảm ${aria}`}
      >
        <ChevronDown className="h-5 w-5" />
      </button>
    </div>
  );
}

export default function TimeSegmentedInput({ value, onChange, className }: Props) {
  const hours = typeof value?.getHours === "function" ? value?.getHours() ?? 8 : 8;
  const minutes = typeof value?.getMinutes === "function" ? value?.getMinutes() ?? 0 : 0;

  const setTime = (h: number, m: number) => {
    if (!value) return;
    const d = new Date(value);
    d.setHours(clamp(h, 0, 23));
    d.setMinutes(clamp(m, 0, 59));
    d.setSeconds(0);
    d.setMilliseconds(0);
    onChange(d);
  };

  const handleHourChange = (v: number) => setTime(v, minutes);
  const handleMinuteChange = (v: number) => setTime(hours, v);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-5 w-5 text-blue-600" />
        <label className="text-sm font-semibold text-gray-800">Chọn giờ</label>
      </div>
      
      <div className="flex items-center justify-center gap-4 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-100">
        <TimeSpinner 
          value={hours} 
          onChange={handleHourChange} 
          max={23} 
          label="Giờ"
          aria="giờ"
        />
        <div className="text-4xl font-bold text-gray-400">:</div>
        <TimeSpinner 
          value={minutes} 
          onChange={handleMinuteChange} 
          max={59} 
          label="Phút"
          aria="phút"
        />
      </div>

      <div className="text-center text-sm text-gray-600 font-medium">
        {String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}
      </div>
    </div>
  );
}
