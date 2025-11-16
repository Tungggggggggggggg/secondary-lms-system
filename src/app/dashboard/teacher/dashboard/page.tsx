"use client";

import StatsOverview from "@/components/teacher/dashboard/StatsOverview";
import RecentClasses from "@/components/teacher/dashboard/RecentClasses";
import PerformanceChart from "@/components/teacher/dashboard/PerformanceChart";

import RecentActivity from "@/components/teacher/dashboard/RecentActivity";
import WeeklyGoals from "@/components/teacher/dashboard/WeeklyGoals";


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
                   
                    <RecentActivity />
                    <WeeklyGoals />
                </div>
            </div>

    
        </div>
    );
}
