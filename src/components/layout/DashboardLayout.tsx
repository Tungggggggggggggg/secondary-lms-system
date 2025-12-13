"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { useSidebarState } from "@/hooks/useSidebarState";
import DashboardTopbar from "@/components/layout/DashboardTopbar";
import type { CSSProperties } from "react";
import SystemStatusGate from "@/components/shared/SystemStatusGate";

type DashboardRole = "teacher" | "student" | "parent" | "admin";

interface DashboardLayoutProps {
  role: DashboardRole;
  sidebarStateKey: string;
  sidebar: ReactNode;
  children: ReactNode;
  rightAside?: ReactNode;
  lockContentScroll?: boolean;
}

export default function DashboardLayout({
  role,
  sidebarStateKey,
  sidebar,
  children,
  rightAside,
  lockContentScroll = false,
}: DashboardLayoutProps) {
  const { expanded, toggle } = useSidebarState(sidebarStateKey);
  const containerVars: CSSProperties = {
    ["--sb-w-expanded" as any]: "280px",
    ["--sb-w-collapsed" as any]: "64px",
  };

  useEffect(() => {
    const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches;
    if (!isMobile) return;
    const body = document.body;
    if (expanded) body.classList.add("overflow-hidden");
    else body.classList.remove("overflow-hidden");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && expanded) toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      body.classList.remove("overflow-hidden");
      window.removeEventListener("keydown", onKey);
    };
  }, [expanded, toggle]);

  return (
    <div className={`flex ${lockContentScroll ? "h-screen overflow-hidden" : "min-h-screen"} bg-gray-50`} style={containerVars}>
      {sidebar}
      <button
        type="button"
        aria-label="Đóng sidebar"
        onClick={toggle}
        className={`lg:hidden fixed inset-0 z-40 bg-slate-900/40 transition-opacity ${expanded ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />
      <main
        className={`flex-1 p-0 transition-[margin-left] duration-300 ease-in-out ml-0 ${
          expanded ? "lg:ml-[var(--sb-w-expanded)]" : "lg:ml-[var(--sb-w-collapsed)]"
        } flex flex-col ${lockContentScroll ? "h-screen overflow-hidden" : "min-h-screen"}`}
      >
        <DashboardTopbar role={role} />
        <SystemStatusGate role={role}>{children}</SystemStatusGate>
      </main>
      {rightAside}
    </div>
  );
}
