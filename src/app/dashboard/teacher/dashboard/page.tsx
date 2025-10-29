"use client";

import StatsOverview from "@/components/teacher/dashboard/StatsOverview";
import RecentClasses from "@/components/teacher/dashboard/RecentClasses";
import PerformanceChart from "@/components/teacher/dashboard/PerformanceChart";
import UpcomingTasks from "@/components/teacher/dashboard/UpcomingTasks";
import RecentActivity from "@/components/teacher/dashboard/RecentActivity";
import WeeklyGoals from "@/components/teacher/dashboard/WeeklyGoals";
import Achievements from "@/components/teacher/dashboard/Achievements";

export default function DashboardPage() {
  return (
    <div className="p-8 space-y-8">
      <StatsOverview />

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <RecentClasses />
          <PerformanceChart />
        </div>

        <div className="space-y-8">
          <UpcomingTasks />
          <RecentActivity />
          <WeeklyGoals />
        </div>
      </div>

      <Achievements />
    </div>
  );
}