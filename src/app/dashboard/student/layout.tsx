"use client";

// src/app/student/layout.tsx
import Sidebar from "@/components/student/Sidebar";
import { ReactNode } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { Toaster } from "@/components/ui/toast";
import { useSidebarState } from "@/hooks/useSidebarState";
import NotificationBell from "@/components/shared/NotificationBell";
import TopbarBreadcrumbs from "@/components/shared/TopbarBreadcrumbs";

export default function StudentLayout({ children }: { children: ReactNode }) {
    const { expanded } = useSidebarState("sidebar:student");
    return (
        <ProtectedRoute allowedRoles={["STUDENT"]}>
            <div className="flex min-h-screen bg-gray-50">
                <Sidebar role="student" />
                <main className={`flex-1 p-0 ${expanded ? "ml-72" : "ml-20"} transition-[margin-left] duration-300 ease-in-out`}>
                    <div className="px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between sticky top-0 z-30 bg-white border-b">
                        <div className="min-w-0">
                            <TopbarBreadcrumbs role="student" />
                        </div>
                        <NotificationBell />
                    </div>
                    <div className="p-8 space-y-8">{children}</div>
                </main>
                <Toaster />
            </div>
        </ProtectedRoute>
    );
}
