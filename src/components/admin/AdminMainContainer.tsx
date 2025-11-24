"use client";

import { useEffect, useState } from "react";
import NotificationBell from "@/components/shared/NotificationBell";
import { useSidebarState } from "@/hooks/useSidebarState";
import OrgContextSwitcher from "@/components/admin/OrgContextSwitcher";

export default function AdminMainContainer({ children }: { children: React.ReactNode }) {
  const { expanded } = useSidebarState("sidebar:admin");
  const [brandColor, setBrandColor] = useState<string>("#8b5cf6");

  useEffect(() => {
    let mounted = true;
    const loadSettings = async () => {
      try {
        const res = await fetch("/api/admin/org/settings");
        const data = await res.json().catch(() => ({}));
        if (res.ok && mounted) {
          const bc = data?.settings?.brandColor || "#8b5cf6";
          setBrandColor(bc);
          try {
            document.documentElement.style.setProperty("--brand-color", bc);
          } catch {}
        }
      } catch {}
    };
    loadSettings();
    const handler = () => loadSettings();
    window.addEventListener("org-context-changed", handler as any);
    return () => window.removeEventListener("org-context-changed", handler as any);
  }, []);
  return (
    <main className={`min-h-screen w-full bg-gray-50 transition-[margin-left] duration-300 ease-in-out ${expanded ? "lg:ml-72" : "lg:ml-20"}`}>
      <div className="px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-end gap-3 sticky top-0 z-30 bg-white border-b" style={{ borderBottomColor: brandColor }}>
        <OrgContextSwitcher />
        <NotificationBell />
      </div>
      <div className="p-4 lg:p-6 max-w-7xl mx-auto">
        {children}
      </div>
    </main>
  );
}
