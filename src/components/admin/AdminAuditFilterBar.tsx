"use client";

import type { FormEvent } from "react";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/button";

interface AdminAuditFilterBarProps {
  actor: string;
  action: string;
  onActorChange: (value: string) => void;
  onActionChange: (value: string) => void;
  entityType?: string;
  onEntityTypeChange?: (value: string) => void;
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
  entityType,
  onEntityTypeChange,
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

  const applyPreset = (preset: "today" | "7d" | "30d" | "all") => {
    const today = new Date();
    const toStr = today.toISOString().slice(0, 10);
    let fromStr = "";
    if (preset === "7d") {
      const d = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
      fromStr = d.toISOString().slice(0, 10);
    } else if (preset === "30d") {
      const d = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
      fromStr = d.toISOString().slice(0, 10);
    } else if (preset === "today") {
      fromStr = toStr;
    }

    if (preset === "all") {
      onFromChange?.("");
      onToChange?.("");
    } else {
      onFromChange?.(fromStr);
      onToChange?.(toStr);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "flex flex-col gap-3 md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div className="grid w-full gap-3 md:grid-cols-2 lg:grid-cols-5 md:items-center">
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
            list="audit-action-suggestions"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
          />
          <datalist id="audit-action-suggestions">
            <option value="USER_BAN" />
            <option value="USER_UNBAN" />
            <option value="CLASSROOM_ARCHIVE" />
            <option value="CLASSROOM_UNARCHIVE" />
            <option value="CLASSROOM_CREATE" />
            <option value="CLASSROOM_UPDATE" />
            <option value="SETTINGS_UPDATE" />
            <option value="ASSIGNMENT_CREATE" />
            <option value="ASSIGNMENT_UPDATE" />
          </datalist>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-slate-600">Entity</label>
          <select
            value={entityType ?? ""}
            onChange={(e) => onEntityTypeChange?.(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
          >
            <option value="">Tất cả</option>
            <option value="USER">USER</option>
            <option value="CLASSROOM">CLASSROOM</option>
            <option value="ASSIGNMENT">ASSIGNMENT</option>
            <option value="ORGANIZATION">ORGANIZATION</option>
          </select>
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

      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2 text-[11px] text-slate-600">
          <span className="font-semibold mr-1">Nhanh:</span>
          <button
            type="button"
            onClick={() => applyPreset("today")}
            className="rounded-full border border-slate-200 px-3 py-1 hover:bg-slate-50 text-slate-700 transition-all active:scale-95 active:translate-y-[1px]"
          >
            Hôm nay
          </button>
          <button
            type="button"
            onClick={() => applyPreset("7d")}
            className="rounded-full border border-slate-200 px-3 py-1 hover:bg-slate-50 text-slate-700 transition-all active:scale-95 active:translate-y-[1px]"
          >
            7 ngày
          </button>
          <button
            type="button"
            onClick={() => applyPreset("30d")}
            className="rounded-full border border-slate-200 px-3 py-1 hover:bg-slate-50 text-slate-700 transition-all active:scale-95 active:translate-y-[1px]"
          >
            30 ngày
          </button>
          <button
            type="button"
            onClick={() => applyPreset("all")}
            className="rounded-full border border-slate-200 px-3 py-1 hover:bg-slate-50 text-slate-700 transition-all active:scale-95 active:translate-y-[1px]"
          >
            Tất cả
          </button>
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
      </div>
    </form>
  );
}
