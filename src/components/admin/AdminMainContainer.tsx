"use client";

import NotificationBell from "@/components/shared/NotificationBell";
import { useSidebarState } from "@/hooks/useSidebarState";

export default function AdminMainContainer({ children }: { children: React.ReactNode }) {
  const { expanded } = useSidebarState("sidebar:admin");
  return (
    <main className={`min-h-screen w-full bg-gray-50 transition-[margin-left] duration-300 ease-in-out ${expanded ? "lg:ml-72" : "lg:ml-20"}`}>
      <div className="px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-end sticky top-0 z-30 bg-white border-b">
        <NotificationBell />
      </div>
      <div className="p-4 lg:p-6 max-w-7xl mx-auto">
        {children}
      </div>
    </main>
  );
}
