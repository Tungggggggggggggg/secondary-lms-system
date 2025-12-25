"use client";

import { LayoutGrid, LayoutList } from "lucide-react";
import { cn } from "@/lib/utils";

export type ViewMode = "list" | "table";

interface ViewToggleProps {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
  className?: string;
}

export default function ViewToggle({ value, onChange, className }: ViewToggleProps) {
  return (
    <div className={cn("inline-flex rounded-xl border border-blue-200 overflow-hidden", className)}>
      <button
        type="button"
        onClick={() => onChange("list")}
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5 text-sm",
          value === "list" ? "bg-blue-600 text-white" : "bg-white text-blue-700 hover:bg-blue-50"
        )}
        aria-pressed={value === "list"}
        aria-label="Xem dạng danh sách"
      >
        <LayoutList className="h-4 w-4" /> Danh sách
      </button>
      <button
        type="button"
        onClick={() => onChange("table")}
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5 text-sm border-l border-blue-200",
          value === "table" ? "bg-blue-600 text-white" : "bg-white text-blue-700 hover:bg-blue-50"
        )}
        aria-pressed={value === "table"}
        aria-label="Xem dạng bảng"
      >
        <LayoutGrid className="h-4 w-4" /> Bảng
      </button>
    </div>
  );
}
