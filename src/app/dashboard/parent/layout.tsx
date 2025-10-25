// src/app/parent/layout.tsx
import SidebarParent from "@/components/parent/Sidebar";
import { ReactNode } from "react";

export default function ParentLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <SidebarParent />
      <main className="flex-1 ml-72 p-8 space-y-8">{children}</main>
    </div>
  );
}
