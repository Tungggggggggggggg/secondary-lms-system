"use client";
import Sidebar from "@/components/teacher/Sidebar";
import Header from "@/components/teacher/Header";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['teacher']}>
      <div className="flex">
        <Sidebar />
        <main className="ml-72 min-h-screen w-full bg-gray-50">
          <Header />
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
