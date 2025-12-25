"use client";

import type { FormEvent } from "react";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/button";

interface AdminAuditFilterBarProps {
  actor: string;
  action: string;
  onActorChange: (value: string) => void;
  onActionChange: (value: string) => void;
  from?: string;
  to?: string;
  onFromChange?: (value: string) => void;
  onToChange?: (value: string) => void;
  onSubmit: () => void;
  onReset: () => void;
  loading?: boolean;
  className?: string;
}

export default function AdminAuditFilterBar({
  actor,
  action,
  onActorChange,
  onActionChange,
  from,
  to,
  onFromChange,
  onToChange,
  onSubmit,
  onReset,
  loading,
  className,
}: AdminAuditFilterBarProps) {
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "flex flex-col gap-3 md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div className="grid w-full gap-3 md:grid-cols-2 lg:grid-cols-4 md:items-center">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-slate-600">Actor ID</label>
          <input
            type="text"
            value={actor}
            onChange={(e) => onActorChange(e.target.value)}
            placeholder="Lọc theo actorId (userId)"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-slate-600">Action</label>
          <input
            type="text"
            value={action}
            onChange={(e) => onActionChange(e.target.value)}
            placeholder="VD: USER_BAN, CLASSROOM_CREATE…"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-slate-600">Từ ngày</label>
          <input
            type="date"
            value={from ?? ""}
            onChange={(e) => onFromChange?.(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-slate-600">Đến ngày</label>
          <input
            type="date"
            value={to ?? ""}
            onChange={(e) => onToChange?.(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
          />
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          color="slate"
          onClick={onReset}
          disabled={loading}
        >
          Đặt lại bộ lọc
        </Button>
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? "Đang lọc..." : "Lọc"}
        </Button>
      </div>
    </form>
  );
}
