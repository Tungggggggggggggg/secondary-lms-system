"use client";

import QuickActions from "@/components/teacher/QuickActions";
import StatsOverview from "@/components/teacher/StatsOverview";
import RecentClasses from "@/components/teacher/RecentClasses";
import PerformanceChart from "@/components/teacher/PerformanceChart";
import UpcomingTasks from "@/components/teacher/UpcomingTasks";
import RecentActivity from "@/components/teacher/RecentActivity";
import WeeklyGoals from "@/components/teacher/WeeklyGoals";
import RecentContent from "@/components/teacher/RecentContent";
import Achievements from "@/components/teacher/Achievements";

export default function DashboardPage() {
  return (
    <div className="p-8 space-y-8">
      <QuickActions />
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

      <RecentContent />
      <Achievements />
    </div>
  );
}

