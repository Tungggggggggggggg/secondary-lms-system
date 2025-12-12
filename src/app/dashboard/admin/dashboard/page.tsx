"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/shared/PageHeader";

type AdminStats = {
  totals: {
    users: number;
    classrooms: number;
    assignments: number;
    organizations: number;
    disabledUsers: number;
  };
  byRole: Record<string, number>;
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/admin/stats", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok || json?.success === false) {
          throw new Error(json?.message || "Không thể tải thống kê admin");
        }
        setStats(json.data as AdminStats);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const totals = stats?.totals;

  return (
    <div className="p-8 space-y-8">
      <PageHeader
        title="Admin Overview"
        subtitle="Giám sát tổng quan hệ thống LMS"
      />

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 flex flex-col gap-2">
          <p className="text-sm font-semibold text-slate-600">Tổng người dùng</p>
          <p className="text-3xl font-extrabold text-slate-900">
            {loading && !totals ? "…" : totals?.users ?? "-"}
          </p>
          <p className="text-[11px] text-slate-500">Bao gồm giáo viên, học sinh, phụ huynh và admin.</p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 flex flex-col gap-2">
          <p className="text-sm font-semibold text-slate-600">Lớp học & Bài tập</p>
          <p className="text-sm text-slate-700">
            <span className="font-semibold text-slate-900 mr-1">{loading && !totals ? "…" : totals?.classrooms ?? "-"}</span>
            lớp học
          </p>
          <p className="text-sm text-slate-700">
            <span className="font-semibold text-slate-900 mr-1">{loading && !totals ? "…" : totals?.assignments ?? "-"}</span>
            bài tập
          </p>
          <p className="text-[11px] text-slate-500">Giúp ước lượng quy mô sử dụng hệ thống.</p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 flex flex-col gap-2">
          <p className="text-sm font-semibold text-slate-600">Tổ chức & Tài khoản bị khoá</p>
          <p className="text-sm text-slate-700">
            <span className="font-semibold text-slate-900 mr-1">{loading && !totals ? "…" : totals?.organizations ?? "-"}</span>
            tổ chức
          </p>
          <p className="text-sm text-slate-700">
            <span className="font-semibold text-red-600 mr-1">{loading && !totals ? "…" : totals?.disabledUsers ?? "0"}</span>
            tài khoản đang bị khoá
          </p>
          <p className="text-[11px] text-slate-500">Quản lý nhanh tình trạng khoá tài khoản toàn hệ thống.</p>
        </div>
      </div>
    </div>
  );
}
