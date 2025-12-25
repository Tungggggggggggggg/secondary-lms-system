"use client";

// src/app/student/layout.tsx
import Sidebar from "@/components/student/Sidebar";
import { ReactNode } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { Toaster } from "@/components/ui/toast";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { usePathname } from "next/navigation";
import { RoleThemeProvider } from "@/components/providers/RoleThemeProvider";

export default function StudentLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const isMessages = pathname?.includes("/dashboard/student/messages");
    return (
        <ProtectedRoute allowedRoles={["STUDENT"]}>
            <RoleThemeProvider color="green" role="student">
                <div className="theme-student">
                    <DashboardLayout
                        role="student"
                        sidebarStateKey="sidebar:student"
                        sidebar={<Sidebar role="student" />}
                        lockContentScroll={isMessages}
                        rightAside={<Toaster />}
                        wrapContent={!isMessages}
                        contentClassName="mx-auto w-full max-w-7xl p-6 lg:p-8 space-y-8"
                    >
                        {children}
                    </DashboardLayout>
                </div>
            </RoleThemeProvider>
        </ProtectedRoute>
    );
}
