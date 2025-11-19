"use client";

// src/app/parent/layout.tsx
import SidebarParent from "@/components/parent/Sidebar";
import { ReactNode } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useSidebarState } from "@/hooks/useSidebarState";
import NotificationBell from "@/components/shared/NotificationBell";
import TopbarBreadcrumbs from "@/components/shared/TopbarBreadcrumbs";

export default function ParentLayout({ children }: { children: ReactNode }) {
    const { expanded } = useSidebarState("sidebar:parent");
    return (
        <ProtectedRoute allowedRoles={["PARENT"]}>
            <div className="flex min-h-screen bg-gray-50">
                <SidebarParent />
                <main className={`flex-1 p-0 ${expanded ? "ml-72" : "ml-20"} transition-[margin-left] duration-300 ease-in-out`}>
                    <div className="px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between sticky top-0 z-30 bg-white border-b">
                        <div className="min-w-0">
                            <TopbarBreadcrumbs role="parent" />
                        </div>
                        <NotificationBell />
                    </div>
                    <div className="p-8 space-y-8">{children}</div>
                </main>
            </div>
        </ProtectedRoute>
    );
}
