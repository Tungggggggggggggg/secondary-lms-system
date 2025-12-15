"use client";

import type { ReactNode } from "react";

interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  label?: string;
  actions?: ReactNode;
}

export default function AdminPageHeader({ title, subtitle, label = "Quản trị hệ thống", actions }: AdminPageHeaderProps) {
  return (
    <header className="mb-6 animate-fade-in">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-100 via-fuchsia-50 to-violet-100 shadow-[0_18px_40px_rgba(15,23,42,0.12)] px-6 py-6 sm:px-8 sm:py-7 transition-all duration-300">
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-2 flex-1">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-violet-700 uppercase">
              {label}
            </p>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900">
              {title}
            </h1>
            {subtitle ? (
              <p className="text-sm sm:text-base text-slate-700 max-w-xl font-medium">
                {subtitle}
              </p>
            ) : null}
          </div>

          {actions ? <div className="shrink-0 pt-1">{actions}</div> : null}
        </div>
      </div>
    </header>
  );
}
