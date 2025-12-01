"use client";

import Link from "next/link";

export interface ActivityItem {
  id: string | number;
  color: string; // tailwind gradient: from-... to-...
  icon: string; // emoji hoặc chữ cái trong vòng tròn
  primaryText: string;
  secondaryText?: string;
  href?: string;
}

interface ActivityListProps {
  title?: string;
  loading: boolean;
  error?: string | null;
  items: ActivityItem[];
  emptyMessage?: string;
}

export default function ActivityList({
  title = "🔔 Hoạt động gần đây",
  loading,
  error,
  items,
  emptyMessage = "Chưa có hoạt động nào",
}: ActivityListProps) {
  if (loading) {
    return (
      <div className="bg-white/90 rounded-3xl border border-slate-100 shadow-[0_10px_30px_rgba(15,23,42,0.06)] p-6 sm:p-7">
        <h2 className="text-2xl font-extrabold text-gray-800 mb-6 flex items-center gap-2">
          {title}
        </h2>
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
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/90 rounded-3xl border border-slate-100 shadow-[0_10px_30px_rgba(15,23,42,0.06)] p-6 sm:p-7">
        <h2 className="text-2xl font-extrabold text-gray-800 mb-6 flex items-center gap-2">
          {title}
        </h2>
        <div className="text-red-500 text-center py-4">
          Có lỗi xảy ra: {error}
        </div>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="bg-white/90 rounded-3xl border border-slate-100 shadow-[0_10px_30px_rgba(15,23,42,0.06)] p-6 sm:p-7">
        <h2 className="text-2xl font-extrabold text-gray-800 mb-6 flex items-center gap-2">
          {title}
        </h2>
        <div className="text-center py-8 text-gray-500">
          <p>{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/90 rounded-3xl border border-slate-100 shadow-[0_10px_30px_rgba(15,23,42,0.06)] p-6 sm:p-7">
      <h2 className="text-2xl font-extrabold text-gray-800 mb-6 flex items-center gap-2">
        {title}
      </h2>
      <div className="space-y-4">
        {items.map((item) => {
          const content = (
            <div className="flex gap-3 transition-transform duration-200 ease-out group-hover:-translate-y-0.5 hover:-translate-y-0.5">
              <div
                className={`w-10 h-10 bg-gradient-to-r ${item.color} rounded-full flex items-center justify-center text-white font-bold`}
              >
                {item.icon}
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-800">{item.primaryText}</p>
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
                className="group block hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors"
              >
                {content}
              </Link>
            );
          }

          return (
            <div key={item.id} className="group">
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
