"use client";

import Sidebar from "@/components/teacher/dashboard/Sidebar";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { usePathname } from "next/navigation";

export default function TeacherLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const isMessages = pathname?.includes("/dashboard/teacher/messages");
    return (
        <ProtectedRoute allowedRoles={["TEACHER"]}>
            <DashboardLayout
                role="teacher"
                sidebarStateKey="sidebar:teacher"
                sidebar={<Sidebar />}
                lockContentScroll={isMessages}
            >
                {children}
            </DashboardLayout>
        </ProtectedRoute>
    );
}
