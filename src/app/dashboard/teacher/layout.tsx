'use client';

import Sidebar from "@/components/teacher/dashboard/Sidebar";
import Header from "@/components/teacher/dashboard/Header";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex">
      <Sidebar />
      <main className="ml-72 min-h-screen w-full bg-gray-50">
        <Header />
        {children}
      </main>
    </div>
  );
}