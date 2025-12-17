"use client";

import type { ReactNode } from "react";

interface AdminUserOverviewProps {
  email: string;
  fullname: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  roleSelectedAt: string | null;
  isDisabled: boolean;
  disabledReason?: string | null;
  teacherClassrooms: number;
  studentEnrollments: number;
  parentRelations: number;
  actions?: ReactNode;
}

export default function AdminUserOverview({
  email,
  fullname,
  role,
  createdAt,
  updatedAt,
  roleSelectedAt,
  isDisabled,
  disabledReason,
  teacherClassrooms,
  studentEnrollments,
  parentRelations,
  actions,
}: AdminUserOverviewProps) {
  const safeFullname = fullname || "(Chưa cập nhật)";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <h2 className="text-base sm:text-lg font-semibold text-slate-900 truncate">{safeFullname}</h2>
            <div className="text-xs text-slate-600 truncate" title={email}>
              {email}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
              <span className="inline-flex items-center rounded-full bg-slate-900 text-emerald-200 px-2.5 py-0.5 font-semibold uppercase tracking-wide">
                {role}
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-semibold border text-[10px] ${
                  isDisabled
                    ? "bg-red-50 text-red-700 border-red-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-100"
                }`}
              >
                {isDisabled ? "Đã khoá" : "Hoạt động"}
              </span>
            </div>
          </div>
          {actions ? <div className="shrink-0 flex flex-col items-end gap-2">{actions}</div> : null}
        </div>

        {isDisabled && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
            {disabledReason || "Không có lý do cụ thể"}
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-3">
        <div className="text-sm font-semibold text-slate-900">Thông tin hệ thống</div>
        <div className="space-y-2 text-[12px] text-slate-700">
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">Ngày tạo</span>
            <span className="text-[11px] text-slate-700">{createdAt}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">Cập nhật gần nhất</span>
            <span className="text-[11px] text-slate-700">{updatedAt}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">Thời điểm chọn role</span>
            <span className="text-[11px] text-slate-700">{roleSelectedAt || "—"}</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-3">
        <div className="text-sm font-semibold text-slate-900">Thống kê nhanh</div>
        <div className="grid grid-cols-3 gap-3">
          <OverviewStat value={teacherClassrooms} label="Lớp (GV)" />
          <OverviewStat value={studentEnrollments} label="Lớp (HS)" />
          <OverviewStat value={parentRelations} label="Liên kết (PH)" />
        </div>
      </div>
    </div>
  );
}

function OverviewStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
      <div className="text-lg font-extrabold text-slate-900">{value}</div>
      <div className="text-[10px] font-semibold text-slate-600">{label}</div>
    </div>
  );
}
