"use client";

import type { ReactNode } from "react";

export interface StatItem {
  icon: ReactNode;
  color: string; // tailwind gradient: from-... to-...
  label: string;
  value: string;
  pillText?: string; // nội dung chip nhỏ, ví dụ "↑ 3%" hoặc "✓"
  subtitle?: string; // dòng mô tả dưới card
}

interface StatsGridProps {
  items: StatItem[];
  onItemClick?: (item: StatItem, index: number) => void;
}

export default function StatsGrid({ items, onItemClick }: StatsGridProps) {
  if (!items || items.length === 0) return null;

  const dense = items.length >= 5;

  return (
    <div
      className={
        // Ép 5 thẻ trên một hàng khi có ≥5 items
        `grid ${dense ? "gap-4 xl:gap-5" : "gap-5 xl:gap-6"} mb-8 ${
          items.length >= 5
            ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5"
            : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
        }`
      }
    >
      {items.map((item, idx) => (
        <div
          key={item.label}
          role={onItemClick ? "button" : undefined}
          tabIndex={onItemClick ? 0 : undefined}
          onClick={onItemClick ? () => onItemClick(item, idx) : undefined}
          onKeyDown={
            onItemClick
              ? (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onItemClick(item, idx);
                  }
                }
              : undefined
          }
          className={`relative overflow-hidden rounded-3xl bg-card/95 border border-border shadow-[0_10px_30px_rgba(15,23,42,0.06)] ${
            dense ? "px-4 py-4 sm:px-4 sm:py-5" : "px-5 py-5 sm:px-6 sm:py-6"
          } transition-all duration-300 ease-out hover:scale-102 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(15,23,42,0.15)] hover:border-border group ${
            onItemClick
              ? `cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background`
              : ""
          }`}
        >
          <div
            className={`pointer-events-none absolute inset-0 opacity-40 bg-gradient-to-br ${item.color} group-hover:opacity-60 transition-opacity duration-300`}
          />

          <div className="relative z-[1] flex items-start justify-between gap-4">
            <div className={dense ? "space-y-2 min-w-0" : "space-y-3 min-w-0"}>
              <div className={dense ? "flex items-center gap-2.5 min-w-0" : "flex items-center gap-3 min-w-0"}>
                <div className={`${dense ? "h-10 w-10 rounded-xl" : "h-12 w-12 rounded-2xl"} flex items-center justify-center bg-background shadow-sm text-2xl transition-transform duration-300 group-hover:scale-110`}>
                  {item.icon}
                </div>
                <span
                  className={`${dense ? "text-[10px] tracking-[0.14em] whitespace-nowrap truncate" : "text-[11px] tracking-[0.16em]"} font-semibold uppercase text-muted-foreground group-hover:text-foreground transition-colors duration-300`}
                  title={dense ? item.label : undefined}
                >
                  {item.label}
                </span>
              </div>
              <div className={`${dense ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl"} font-extrabold text-foreground transition-colors duration-300`}>
                {item.value}
              </div>
            </div>

            {item.pillText && (
              <span className={`${dense ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-xs"} inline-flex items-center rounded-full bg-background/80 font-semibold text-foreground shadow-sm transition-all duration-300 group-hover:bg-background group-hover:shadow-md`}>
                {item.pillText}
              </span>
            )}
          </div>

          {item.subtitle && (
            <p className={`${dense ? "text-[11px] sm:text-xs line-clamp-2" : "text-xs sm:text-sm"} relative z-[1] mt-3 text-muted-foreground group-hover:text-foreground transition-colors duration-300`}>
              {item.subtitle}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
