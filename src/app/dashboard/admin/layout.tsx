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
      <RoleThemeProvider color="violet" role="admin">
        <div className="theme-admin">
          <DashboardLayout
            role="admin"
            sidebarStateKey="sidebar:admin"
            sidebar={<DashboardSidebar role="admin" />}
            contentClassName="mx-auto w-full max-w-7xl p-6 lg:p-8 space-y-8"
          >
            {children}
          </DashboardLayout>
        </div>
      </RoleThemeProvider>
    </ProtectedRoute>
  );
}
