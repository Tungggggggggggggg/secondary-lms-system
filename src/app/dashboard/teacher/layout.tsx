"use client";

import Sidebar from "@/components/teacher/dashboard/Sidebar";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";

export default function TeacherLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ProtectedRoute allowedRoles={["TEACHER"]}>
            <DashboardLayout
                role="teacher"
                sidebarStateKey="sidebar:teacher"
                sidebar={<Sidebar />}
            >
                {children}
            </DashboardLayout>
        </ProtectedRoute>
    );
}
