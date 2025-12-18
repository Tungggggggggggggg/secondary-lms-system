"use client";

import { TopbarBreadcrumbs } from "@/components/shared";
import { NotificationBell } from "@/components/shared";
import { useSidebarState } from "@/hooks/useSidebarState";
import { Menu } from "lucide-react";

type DashboardTopbarRole = "teacher" | "student" | "parent" | "admin";

interface DashboardTopbarProps {
  role: DashboardTopbarRole;
}

export default function DashboardTopbar({ role }: DashboardTopbarProps) {
  const { toggle } = useSidebarState(`sidebar:${role}`);

  const accent = {
    teacher: {
      button: "bg-blue-50 hover:bg-blue-100 focus-visible:ring-blue-300",
      icon: "text-blue-700",
    },
    student: {
      button: "bg-green-50 hover:bg-green-100 focus-visible:ring-green-300",
      icon: "text-green-700",
    },
    parent: {
      button: "bg-amber-50 hover:bg-amber-100 focus-visible:ring-amber-300",
      icon: "text-amber-800",
    },
    admin: {
      button: "bg-slate-100 hover:bg-slate-200 focus-visible:ring-slate-300",
      icon: "text-slate-700",
    },
  }[role];

  return (
    <div
      className={`lg:hidden px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between sticky top-0 z-30 bg-white border-b border-slate-200`}
    >
      <div className="min-w-0 flex items-center gap-2">
        <button
          type="button"
          onClick={toggle}
          aria-label="Mở/đóng sidebar"
          className={`lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${accent.button}`}
        >
          <Menu className={`h-5 w-5 ${accent.icon}`} />
        </button>
        <TopbarBreadcrumbs role={role} />
      </div>
      <div className="lg:hidden">
        <NotificationBell />
      </div>
    </div>
  );
}
