
"use client";

import Sidebar from "@/components/teacher/Sidebar";
import Topbar from "@/components/teacher/Topbar";
import WelcomeSection from "@/components/teacher/WelcomeSection";
import StatsGrid from "@/components/teacher/StatsGrid";
import CoursesSection from "@/components/teacher/CoursesSection";
import Notifications from "@/components/teacher/Notifications";
import Schedule from "@/components/teacher/Schedule";

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-6">
        <Topbar />
        <div className="mt-6 space-y-6">
          <WelcomeSection />
          <StatsGrid />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <CoursesSection />
            </div>
            <div className="space-y-6">
              <Notifications />
              <Schedule />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
