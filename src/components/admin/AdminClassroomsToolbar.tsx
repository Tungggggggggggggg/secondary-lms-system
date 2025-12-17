"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/button";

export type ClassroomStatusValue = "" | "active" | "archived";

export type ClassroomStatusOption = {
  label: string;
  value: ClassroomStatusValue;
};

interface AdminClassroomsToolbarProps {
  statusOptions: ClassroomStatusOption[];
  statusValue: ClassroomStatusValue;
  onStatusChange: (value: ClassroomStatusValue) => void;
  search: string;
  onSearchChange: (value: string) => void;
  onSubmit: () => void;
  onReset?: () => void;
  right?: ReactNode;
  className?: string;
}

export default function AdminClassroomsToolbar({
  statusOptions,
  statusValue,
  onStatusChange,
  search,
  onSearchChange,
  onSubmit,
  onReset,
  right,
  className,
}: AdminClassroomsToolbarProps) {
  const canReset = !!onReset && (statusValue !== "" || search.trim().length > 0);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between gap-3">
        <div
          className="inline-flex max-w-full items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 overflow-x-auto"
          role="group"
          aria-label="Lọc theo trạng thái lớp"
        >
          {statusOptions.map((opt) => {
            const active = statusValue === opt.value;
            return (
              <button
                key={opt.label}
                type="button"
                onClick={() => onStatusChange(opt.value)}
                aria-pressed={active}
                className={cn(
                  "h-9 px-3 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400",
                  active
                    ? "bg-slate-900 text-white border border-transparent"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {right ? <div className="hidden md:flex items-center gap-2 justify-end">{right}</div> : null}
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm theo mã lớp, tên lớp, giáo viên..."
            aria-label="Tìm theo mã lớp, tên lớp, giáo viên"
            className="flex-1 md:w-96 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
          />
          <Button type="button" variant="default" size="sm" onClick={onSubmit}>
            Tìm kiếm
          </Button>
          {canReset ? (
            <Button type="button" variant="outline" size="sm" onClick={onReset}>
              Reset
            </Button>
          ) : null}
        </div>

        {right ? <div className="flex md:hidden items-center gap-2 justify-end">{right}</div> : null}
      </div>
    </div>
  );
}
