"use client";

// src/app/parent/layout.tsx
import SidebarParent from "@/components/parent/Sidebar";
import { ReactNode } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { usePathname } from "next/navigation";
import { RoleThemeProvider } from "@/components/providers/RoleThemeProvider";

export default function ParentLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const isMessages = pathname?.includes("/dashboard/parent/messages");
    return (
        <ProtectedRoute allowedRoles={["PARENT"]}>
            <RoleThemeProvider color="amber" role="parent">
                <div className="theme-parent">
                    <DashboardLayout
                        role="parent"
                        sidebarStateKey="sidebar:parent"
                        sidebar={<SidebarParent />}
                        lockContentScroll={isMessages}
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

