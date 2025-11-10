// src/app/student/layout.tsx
import Sidebar from "@/components/student/Sidebar";
import { ReactNode } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { Toaster } from "@/components/ui/toast";

export default function StudentLayout({ children }: { children: ReactNode }) {
    return (
        <ProtectedRoute allowedRoles={["STUDENT"]}>
            <div className="flex min-h-screen bg-gray-50">
                <Sidebar role="student" />
                <main className="flex-1 ml-72 p-8 space-y-8">{children}</main>
                <Toaster />
            </div>
        </ProtectedRoute>
    );
}
