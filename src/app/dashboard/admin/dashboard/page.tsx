"use client";

import Link from "next/link";
import { StatsGrid, type StatItem, InitialBadge, KpiSkeletonGrid, ErrorBanner } from "@/components/shared";
import Button from "@/components/ui/button";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { useAdminStats } from "@/hooks/use-admin-stats";

export default function AdminDashboardPage() {
  const { stats, isLoading, error, mutate } = useAdminStats();
  const totals = stats?.totals;

  const formatNumber = (n: number) => n.toLocaleString("vi-VN");

  const kpiItems: StatItem[] = totals
    ? [
        {
          icon: <InitialBadge text="U" tone="blue" size="sm" />,
          color: "from-blue-300 to-indigo-200",
          label: "Người dùng",
          value: formatNumber(totals.users),
          subtitle: "Tổng tài khoản toàn hệ thống",
        },
        {
          icon: <InitialBadge text="C" tone="green" size="sm" />,
          color: "from-emerald-300 to-green-200",
          label: "Lớp học",
          value: formatNumber(totals.classrooms),
          subtitle: "Số lớp đang hoạt động",
        },
        {
          icon: <InitialBadge text="A" tone="amber" size="sm" />,
          color: "from-amber-300 to-orange-200",
          label: "Bài tập",
          value: formatNumber(totals.assignments),
          subtitle: "Tổng số bài tập/quiz",
        },
        {
          icon: <InitialBadge text="O" tone="violet" size="sm" />,
          color: "from-violet-300 to-fuchsia-200",
          label: "Tổ chức",
          value: formatNumber(totals.organizations),
          subtitle: "Đơn vị/Trường/Org",
        },
        {
          icon: <InitialBadge text="!" tone="red" size="sm" />,
          color: "from-red-300 to-rose-200",
          label: "Tài khoản khoá",
          value: formatNumber(totals.disabledUsers),
          pillText: totals.disabledUsers > 0 ? "Cần xử lý" : "OK",
          subtitle: "Người dùng bị vô hiệu hoá",
        },
      ]
    : [];

  const roleCounts = stats?.byRole ?? {};
  const roleItems: Array<{ key: string; label: string; tone: "blue" | "green" | "amber" | "slate" }> = [
    { key: "TEACHER", label: "Teacher", tone: "blue" },
    { key: "STUDENT", label: "Student", tone: "green" },
    { key: "PARENT", label: "Parent", tone: "amber" },
    { key: "ADMIN", label: "Admin", tone: "slate" },
  ];

  return (
    <div className="p-6 sm:p-8">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <AdminPageHeader
          title="Admin Overview"
          subtitle="Giám sát tổng quan hệ thống LMS"
          actions={
            <div className="flex items-center gap-3">
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/admin/users">Users</Link>
              </Button>
              <Button asChild variant="default" size="sm">
                <Link href="/dashboard/admin/settings">System Settings</Link>
              </Button>
            </div>
          }
        />

        {error ? <ErrorBanner message={error} onRetry={() => mutate()} /> : null}

        {isLoading && !totals ? <KpiSkeletonGrid count={5} /> : <StatsGrid items={kpiItems} />}

        <div className="mx-auto w-full max-w-3xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">Phân bố theo vai trò</h2>
                <p className="text-sm text-slate-600">Tỷ lệ người dùng theo nhóm quyền.</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => mutate()}>
                Làm mới
              </Button>
            </div>

            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {roleItems.map((r) => {
                const value = roleCounts[r.key] ?? 0;
                return (
                  <div key={r.key} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-center gap-3">
                      <InitialBadge text={r.label.slice(0, 1)} size="sm" tone={r.tone} />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-600 uppercase tracking-[0.12em]">
                          {r.label}
                        </div>
                        <div className="text-2xl font-extrabold text-slate-900">{formatNumber(value)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
