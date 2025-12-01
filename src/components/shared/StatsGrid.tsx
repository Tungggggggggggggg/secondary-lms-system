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
}

export default function StatsGrid({ items }: StatsGridProps) {
  if (!items || items.length === 0) return null;

  return (
    <div className="grid gap-6 mb-8 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="relative overflow-hidden rounded-3xl bg-white/90 border border-slate-100 shadow-[0_10px_30px_rgba(15,23,42,0.06)] px-5 py-5 sm:px-6 sm:py-6 transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(15,23,42,0.10)]"
        >
          <div
            className={`pointer-events-none absolute inset-0 opacity-50 bg-gradient-to-br ${item.color}`}
          />

          <div className="relative z-[1] flex items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm text-2xl">
                  {item.icon}
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                  {item.label}
                </span>
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold text-slate-900">
                {item.value}
              </div>
            </div>

            {item.pillText && (
              <span className="inline-flex items-center rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                {item.pillText}
              </span>
            )}
          </div>

          {item.subtitle && (
            <p className="relative z-[1] mt-3 text-xs sm:text-sm text-slate-600">
              {item.subtitle}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
