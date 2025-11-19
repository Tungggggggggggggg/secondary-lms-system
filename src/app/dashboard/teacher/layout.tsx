"use client";

import Sidebar from "@/components/teacher/dashboard/Sidebar";
import Header from "@/components/teacher/dashboard/Header";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useSidebarState } from "@/hooks/useSidebarState";

export default function TeacherLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { expanded } = useSidebarState("sidebar:teacher");
    return (
        <ProtectedRoute allowedRoles={["TEACHER"]}>
            <div className="flex">
                <Sidebar />
                <main className={`min-h-screen w-full bg-gray-50 transition-[margin-left] duration-300 ease-in-out ${expanded ? "ml-72" : "ml-20"}`}>
                    <Header />
                    {children}
                </main>
            </div>
        </ProtectedRoute>
    );
}
