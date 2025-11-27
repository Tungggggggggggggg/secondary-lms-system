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
    <div className="grid md:grid-cols-4 gap-6 mb-8">
      {items.map((item) => (
        <div
          key={item.label}
          className={`bg-gradient-to-br ${item.color} rounded-2xl p-6 text-white hover-lift transition-transform duration-300 ease-out`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center text-2xl">
              {item.icon}
            </div>
            <div className="text-right">
              <div className="text-3xl font-extrabold">{item.value}</div>
              <div className="text-white/80 text-sm">{item.label}</div>
            </div>
          </div>
          {item.pillText && item.subtitle ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="bg-white/20 px-2 py-1 rounded-full">{item.pillText}</span>
              <span className="text-white/80">{item.subtitle}</span>
            </div>
          ) : item.subtitle ? (
            <p className="text-sm text-white/80">{item.subtitle}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
