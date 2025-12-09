"use client";

import React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface ChipItem {
  id: string;
  label: string;
  meta?: string;
}

interface SelectedChipsProps {
  items: ChipItem[];
  onRemove: (id: string) => void;
  onClearAll: () => void;
  className?: string;
  showClear?: boolean;
}

export default function SelectedChips({ items, onRemove, onClearAll, className, showClear = true }: SelectedChipsProps) {
  if (!items.length) {
    return (
      <div className={cn("text-gray-500 text-sm flex items-center gap-2", className)}>
        <span>Chưa chọn lớp học nào</span>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {items.map((it) => (
        <span key={it.id} className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm bg-blue-50 border-blue-200 text-blue-800">
          <span className="truncate max-w-[200px]" title={it.label}>{it.label}{it.meta ? ` (${it.meta})` : ""}</span>
          <button type="button" aria-label={`Bỏ ${it.label}`} className="p-0.5 rounded-full hover:bg-blue-100" onClick={() => onRemove(it.id)}>
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      ))}
      {showClear && (
        <Button type="button" size="sm" variant="outline" onClick={onClearAll}>Bỏ chọn hết</Button>
      )}
    </div>
  );
}
