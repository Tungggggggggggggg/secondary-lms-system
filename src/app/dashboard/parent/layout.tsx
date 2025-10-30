// src/app/parent/layout.tsx
import SidebarParent from "@/components/parent/Sidebar";
import { ReactNode } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

export default function ParentLayout({ children }: { children: ReactNode }) {
    return (
        <ProtectedRoute allowedRoles={["PARENT"]}>
            <div className="flex min-h-screen bg-gray-50">
                <SidebarParent />
                <main className="flex-1 ml-72 p-8 space-y-8">{children}</main>
            </div>
        </ProtectedRoute>
    );
}
