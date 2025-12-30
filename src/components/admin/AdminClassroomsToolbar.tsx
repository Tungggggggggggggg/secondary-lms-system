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
  right,
  className,
}: AdminClassroomsToolbarProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between gap-3">
        <div
          className="inline-flex max-w-full items-center gap-1 rounded-xl border border-border bg-card p-1 overflow-x-auto"
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
                  "h-9 px-3 rounded-lg text-sm font-semibold whitespace-nowrap transition-all active:scale-95 active:translate-y-[1px]",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  active
                    ? "bg-primary text-primary-foreground border border-transparent"
                    : "border border-border bg-background text-foreground/80 hover:bg-muted/50"
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
            className="flex-1 md:w-96 rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          />
          <Button type="button" variant="default" size="sm" onClick={onSubmit}>
            Tìm kiếm
          </Button>
        </div>

        {right ? <div className="flex md:hidden items-center gap-2 justify-end">{right}</div> : null}
      </div>
    </div>
  );
}
