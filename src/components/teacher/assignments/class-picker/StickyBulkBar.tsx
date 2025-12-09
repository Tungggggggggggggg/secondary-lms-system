"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StickyBulkBarProps {
  selectedCount: number;
  filteredCount: number;
  onSelectAll: () => void;
  onClear: () => void;
  className?: string;
}

export default function StickyBulkBar({ selectedCount, filteredCount, onSelectAll, onClear, className }: StickyBulkBarProps) {
  if (selectedCount <= 0) return null;
  return (
    <div
      className={cn(
        "sticky bottom-2 z-10 mx-auto max-w-4xl",
        "rounded-lg border bg-white/85 backdrop-blur px-4 py-2 shadow-md",
        "flex items-center justify-between gap-3",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="text-sm font-medium text-gray-700">
        Đã chọn {selectedCount} / {filteredCount} kết quả đang lọc
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={onClear}>Bỏ chọn</Button>
        <Button type="button" size="sm" onClick={onSelectAll}>Chọn tất cả</Button>
      </div>
    </div>
  );
}
