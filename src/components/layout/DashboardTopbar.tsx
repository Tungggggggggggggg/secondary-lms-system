"use client";

import TopbarBreadcrumbs from "@/components/shared/TopbarBreadcrumbs";
import NotificationBell from "@/components/shared/NotificationBell";

type DashboardTopbarRole = "teacher" | "student" | "parent";

interface DashboardTopbarProps {
  role: DashboardTopbarRole;
}

export default function DashboardTopbar({ role }: DashboardTopbarProps) {
  const borderClass =
    role === "teacher"
      ? "border-purple-100"
      : role === "student"
      ? "border-emerald-100"
      : "border-orange-100";

  return (
    <div
      className={`px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between sticky top-0 z-30 bg-white border-b ${borderClass} shadow-sm`}
    >
      <div className="min-w-0">
        <TopbarBreadcrumbs role={role} />
      </div>
      <NotificationBell />
    </div>
  );
}
