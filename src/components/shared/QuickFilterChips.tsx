"use client";

import { cn } from "@/lib/utils";

type QuickKey = "all" | "active" | "completed" | "needGrading" | "archived";

interface QuickFilterChipsProps {
  value: QuickKey;
  onChange: (key: QuickKey) => void;
  disabledKeys?: QuickKey[];
  className?: string;
  counts?: Partial<Record<QuickKey, number>>;
  items?: { key: QuickKey; label: string }[];
}

const DEFAULT_ITEMS: { key: QuickKey; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "active", label: "Đang diễn ra" },
  { key: "completed", label: "Đã kết thúc" },
  { key: "needGrading", label: "Cần chấm" },
];

export default function QuickFilterChips({ value, onChange, disabledKeys = [], className, counts, items }: QuickFilterChipsProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {(items ?? DEFAULT_ITEMS).map((item) => {
        const disabled = disabledKeys.includes(item.key);
        const active = value === item.key;
        const c = typeof counts?.[item.key] === "number" ? counts?.[item.key] : undefined;
        return (
          <button
            key={item.key}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onChange(item.key)}
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border",
              active
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
              disabled && !active ? "opacity-60 cursor-not-allowed" : undefined
            )}
            aria-pressed={active}
          >
            {item.label}
            {typeof c === "number" ? <span className={cn("ml-1", active ? "text-blue-100/90" : "text-blue-700/70")}>({c})</span> : null}
          </button>
        );
      })}
    </div>
  );
}
