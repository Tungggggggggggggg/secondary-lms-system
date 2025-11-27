"use client";

// src/app/parent/layout.tsx
import SidebarParent from "@/components/parent/Sidebar";
import { ReactNode } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";

export default function ParentLayout({ children }: { children: ReactNode }) {
    return (
        <ProtectedRoute allowedRoles={["PARENT"]}>
            <DashboardLayout
                role="parent"
                sidebarStateKey="sidebar:parent"
                sidebar={<SidebarParent />}
            >
                <div className="p-8 space-y-8">{children}</div>
            </DashboardLayout>
        </ProtectedRoute>
    );
}
