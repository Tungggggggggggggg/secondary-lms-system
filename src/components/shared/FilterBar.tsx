"use client";

import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

type FilterBarColor = "default" | "blue" | "green" | "amber";

interface FilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  color?: FilterBarColor;
  className?: string;
  right?: ReactNode;
  bottom?: ReactNode;
  onReset?: () => void;
}

export default function FilterBar({
  search,
  onSearchChange,
  placeholder = "Tìm kiếm...",
  color = "blue",
  className,
  right,
  bottom,
  onReset,
}: FilterBarProps) {
  const colorRing: Record<FilterBarColor, string> = {
    default: "focus-visible:ring-gray-300",
    blue: "focus-visible:ring-blue-300",
    green: "focus-visible:ring-green-300",
    amber: "focus-visible:ring-amber-300",
  };

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-xs lg:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder={placeholder}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className={cn("h-11 w-full pl-9", colorRing[color])}
            color={color}
            aria-label={placeholder}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 justify-start md:justify-end">
          {right}
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-2 h-11 rounded-xl border border-gray-200 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              aria-label="Đặt lại bộ lọc"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {bottom}
    </div>
  );
}
