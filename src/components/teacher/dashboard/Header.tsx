"use client";

import NotificationBell from "@/components/shared/NotificationBell";
import TopbarBreadcrumbs from "@/components/shared/TopbarBreadcrumbs";

export default function Header() {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-40">
      <div className="px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <TopbarBreadcrumbs role="teacher" />
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
        </div>
      </div>
    </header>
  );
}