"use client";

// src/app/student/layout.tsx
import Sidebar from "@/components/student/Sidebar";
import { ReactNode } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { Toaster } from "@/components/ui/toast";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { usePathname } from "next/navigation";

export default function StudentLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const isMessages = pathname?.includes("/dashboard/student/messages");
    return (
        <ProtectedRoute allowedRoles={["STUDENT"]}>
            <DashboardLayout
                role="student"
                sidebarStateKey="sidebar:student"
                sidebar={<Sidebar role="student" />}
                rightAside={<Toaster />}
            >
                {isMessages ? children : <div className="p-8 space-y-8">{children}</div>}
            </DashboardLayout>
        </ProtectedRoute>
    );
}
