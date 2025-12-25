"use client";

import Link from "next/link";
import { SectionCard } from "@/components/shared";
import type { ReactNode } from "react";

export interface ActivityItem {
  id: string | number;
  color: string; // tailwind gradient: from-... to-...
  icon: ReactNode; // Lucide icon
  primaryText: string;
  secondaryText?: string | ReactNode;
  href?: string;
  status?: "graded" | "submitted";
}

interface ActivityListProps {
  title?: ReactNode;
  loading: boolean;
  error?: string | null;
  items: ActivityItem[];
  emptyMessage?: string;
  actions?: ReactNode;
  className?: string;
}

export default function ActivityList({
  title = "Hoạt động gần đây",
  loading,
  error,
  items,
  emptyMessage = "Chưa có hoạt động nào",
  actions,
  className,
}: ActivityListProps) {
  if (loading) {
    return (
      <SectionCard className={className} title={title} actions={actions}>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-20"></div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    );
  }

  if (error) {
    return (
      <SectionCard className={className} title={title} actions={actions}>
        <div className="text-red-500 text-center py-4">Có lỗi xảy ra: {error}</div>
      </SectionCard>
    );
  }

  if (!items || items.length === 0) {
    return (
      <SectionCard className={className} title={title} actions={actions}>
        <div className="text-center py-8 text-gray-500">
          <p>{emptyMessage}</p>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard className={className} title={title} actions={actions}>
      <div className="space-y-3">
        {items.map((item, index) => {
          const isGraded = item.status ? item.status === "graded" : item.primaryText.includes("Nhận điểm");
          const badgeColor = isGraded 
            ? "bg-green-100 text-green-700 border-green-200" 
            : "bg-emerald-100 text-emerald-700 border-emerald-200";
          const badgeLabel = isGraded ? "Đã chấm" : "Đã nộp";

          const content = (
            <div className="flex gap-3 items-start transition-transform duration-200 ease-out group-hover:-translate-y-0.5 hover:-translate-y-0.5">
              <div
                className={`w-10 h-10 bg-gradient-to-r ${item.color} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 mt-0.5`}
              >
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-medium text-gray-800 line-clamp-2">{item.primaryText}</p>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold border whitespace-nowrap flex-shrink-0 ${badgeColor}`}>
                    {badgeLabel}
                  </span>
                </div>
                {item.secondaryText && (
                  <p className="text-xs text-gray-500">{item.secondaryText}</p>
                )}
              </div>
            </div>
          );

          if (item.href) {
            return (
              <Link
                key={item.id}
                href={item.href}
                className="group block hover:bg-green-50/40 rounded-lg p-3 -m-3 transition-all duration-200 border border-transparent hover:border-green-100"
              >
                {content}
              </Link>
            );
          }

          return (
            <div key={item.id} className="group p-3 -m-3 rounded-lg hover:bg-green-50/40 transition-all duration-200 border border-transparent hover:border-green-100">
              {content}
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}
