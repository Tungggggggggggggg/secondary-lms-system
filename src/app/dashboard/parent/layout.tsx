"use client";

// src/app/parent/layout.tsx
import SidebarParent from "@/components/parent/Sidebar";
import { ReactNode } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { usePathname } from "next/navigation";

export default function ParentLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const isMessages = pathname?.includes("/dashboard/parent/messages");
    return (
        <ProtectedRoute allowedRoles={["PARENT"]}>
            <DashboardLayout
                role="parent"
                sidebarStateKey="sidebar:parent"
                sidebar={<SidebarParent />}
            >
                {isMessages ? children : <div className="p-8 space-y-8">{children}</div>}
            </DashboardLayout>
        </ProtectedRoute>
    );
}
