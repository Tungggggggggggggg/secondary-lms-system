"use client";

import type { ReactNode } from "react";

interface AdminUserSectionCardProps {
  title: string;
  description?: string;
  count?: number;
  children: ReactNode;
}

export default function AdminUserSectionCard({ title, description, count, children }: AdminUserSectionCardProps) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          {description ? <div className="text-xs text-slate-500 mt-1">{description}</div> : null}
        </div>
        {typeof count === "number" ? (
          <span className="text-[11px] font-semibold text-slate-600">{count} mục</span>
        ) : null}
      </div>

      {children}
    </div>
  );
}
