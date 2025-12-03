"use client";

import TopbarBreadcrumbs from "@/components/shared/TopbarBreadcrumbs";
import NotificationBell from "@/components/shared/NotificationBell";
import { useSidebarState } from "@/hooks/useSidebarState";
import { Menu } from "lucide-react";

type DashboardTopbarRole = "teacher" | "student" | "parent";

interface DashboardTopbarProps {
  role: DashboardTopbarRole;
}

export default function DashboardTopbar({ role }: DashboardTopbarProps) {
  const { toggle } = useSidebarState(`sidebar:${role}`);

  return (
    <div
      className={`lg:hidden px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between sticky top-0 z-30 bg-white`}
    >
      <div className="min-w-0 flex items-center gap-2">
        <button
          type="button"
          onClick={toggle}
          aria-label="Mở/đóng sidebar"
          className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-md bg-gray-100 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-300"
        >
          <Menu className="h-5 w-5 text-gray-700" />
        </button>
        <TopbarBreadcrumbs role={role} />
      </div>
      <div className="lg:hidden">
        <NotificationBell />
      </div>
    </div>
  );
}
