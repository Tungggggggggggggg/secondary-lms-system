"use client";

import type { ReactNode } from "react";
import { useSidebarState } from "@/hooks/useSidebarState";
import DashboardTopbar from "@/components/layout/DashboardTopbar";

type DashboardRole = "teacher" | "student" | "parent";

interface DashboardLayoutProps {
  role: DashboardRole;
  sidebarStateKey: string;
  sidebar: ReactNode;
  children: ReactNode;
  rightAside?: ReactNode;
}

export default function DashboardLayout({
  role,
  sidebarStateKey,
  sidebar,
  children,
  rightAside,
}: DashboardLayoutProps) {
  const { expanded } = useSidebarState(sidebarStateKey);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {sidebar}
      <main
        className={`flex-1 p-0 transition-[margin-left] duration-300 ease-in-out ${
          expanded ? "ml-72" : "ml-20"
        } flex flex-col min-h-0 overflow-hidden`}
      >
        <DashboardTopbar role={role} />
        <div className="flex-1 min-h-0 overflow-hidden">
          {children}
        </div>
      </main>
      {rightAside}
    </div>
  );
}
