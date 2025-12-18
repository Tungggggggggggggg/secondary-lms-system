"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import DashboardSidebar from "@/components/layout/Sidebar";
import { RoleThemeProvider } from "@/components/providers/RoleThemeProvider";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={["ADMIN"]}>
      <RoleThemeProvider color="blue">
        <div className="theme-admin">
          <DashboardLayout
            role="admin"
            sidebarStateKey="sidebar:admin"
            sidebar={<DashboardSidebar role="admin" />}
          >
            {children}
          </DashboardLayout>
        </div>
      </RoleThemeProvider>
    </ProtectedRoute>
  );
}
