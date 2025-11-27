// src/components/layout/Sidebar.tsx
"use client";

import DashboardSidebar from "@/components/layout/Sidebar";

interface SidebarProps {
    role?: "student" | "teacher" | "parent";
}

export default function Sidebar({ role = "student" }: SidebarProps) {
    return <DashboardSidebar role={role} />;
}
