"use client";

// src/app/student/layout.tsx
import Sidebar from "@/components/student/Sidebar";
import { ReactNode } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { Toaster } from "@/components/ui/toast";
import DashboardLayout from "@/components/layout/DashboardLayout";

export default function StudentLayout({ children }: { children: ReactNode }) {
    return (
        <ProtectedRoute allowedRoles={["STUDENT"]}>
            <DashboardLayout
                role="student"
                sidebarStateKey="sidebar:student"
                sidebar={<Sidebar role="student" />}
                rightAside={<Toaster />}
            >
                <div className="p-8 space-y-8">{children}</div>
            </DashboardLayout>
        </ProtectedRoute>
    );
}
