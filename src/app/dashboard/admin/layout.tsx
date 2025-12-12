"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import DashboardSidebar from "@/components/layout/Sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={["ADMIN"]}>
      <DashboardLayout
        role="admin"
        sidebarStateKey="sidebar:admin"
        sidebar={<DashboardSidebar role="admin" />}
      >
        {children}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
