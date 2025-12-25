"use client";

import Link from "next/link";
import { StatsGrid, type StatItem, InitialBadge, KpiSkeletonGrid, ErrorBanner } from "@/components/shared";
import Button from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { useAdminStats } from "@/hooks/use-admin-stats";

export default function AdminDashboardPage() {
  const { stats, isLoading, error, mutate } = useAdminStats();
  const totals = stats?.totals;

  const formatNumber = (n: number) => n.toLocaleString("vi-VN");
  const formatPercent = (n: number) => `${Math.round(n)}%`;

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

  const toneMeta: Record<"blue" | "green" | "amber" | "slate", { bar: string; softBg: string }> = {
    blue: { bar: "bg-blue-500", softBg: "bg-blue-50" },
    green: { bar: "bg-emerald-500", softBg: "bg-emerald-50" },
    amber: { bar: "bg-amber-500", softBg: "bg-amber-50" },
    slate: { bar: "bg-slate-500", softBg: "bg-slate-100" },
  };

  return (
    <div className="p-6 sm:p-8">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <AdminPageHeader
          title="Tổng quan quản trị"
          subtitle="Theo dõi chỉ số hệ thống và phân bố người dùng."
          actions={
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/admin/users">Quản lý người dùng</Link>
              </Button>
              <Button asChild variant="default" size="sm">
                <Link href="/dashboard/admin/settings">Cài đặt hệ thống</Link>
              </Button>
            </div>
          }
        />

        {error ? <ErrorBanner message={error} onRetry={() => mutate()} /> : null}

        {isLoading && !totals ? <KpiSkeletonGrid count={4} /> : <StatsGrid items={kpiItems} />}

        <div className="mx-auto w-full max-w-6xl">
          <Card className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-extrabold text-foreground">Phân bố theo vai trò</h2>
                <p className="text-sm text-muted-foreground">Số lượng và tỷ lệ người dùng theo nhóm quyền.</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => mutate()}>
                Làm mới
              </Button>
            </div>

            <div className="mt-5">
              <div className="rounded-2xl border border-border bg-muted/30 p-4">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.12em]">
                  Tỷ lệ người dùng
                </div>

                <div
                  className="mt-3 h-4 rounded-full bg-background overflow-hidden border border-border"
                  role="img"
                  aria-label="Thanh phân bố người dùng theo vai trò"
                >
                  {roleItems.map((r) => {
                    const value = roleCounts[r.key] ?? 0;
                    const base = totals?.users ?? 0;
                    const pct = base > 0 ? (value / base) * 100 : 0;
                    return (
                      <div
                        key={r.key}
                        className={`h-full ${toneMeta[r.tone].bar} float-left`}
                        style={{ width: `${pct}%` }}
                        title={`${r.label}: ${formatNumber(value)} (${formatPercent(pct)})`}
                      />
                    );
                  })}
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {roleItems.map((r) => {
                    const value = roleCounts[r.key] ?? 0;
                    const base = totals?.users ?? 0;
                    const pct = base > 0 ? (value / base) * 100 : 0;
                    return (
                      <div
                        key={r.key}
                        className="flex items-center justify-between gap-4 rounded-xl bg-card/60 border border-border px-3 py-2"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`h-2.5 w-2.5 rounded-full ${toneMeta[r.tone].bar}`} aria-hidden="true" />
                          <InitialBadge text={r.label.slice(0, 1)} size="sm" tone={r.tone} />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-foreground truncate">{r.label}</div>
                            <div className="text-[11px] text-muted-foreground">{formatPercent(pct)}</div>
                          </div>
                        </div>

                        <div className="text-sm font-extrabold text-foreground tabular-nums">
                          {formatNumber(value)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
