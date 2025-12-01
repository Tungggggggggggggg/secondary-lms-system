"use client";

import StatsOverview from "@/components/teacher/dashboard/StatsOverview";
import RecentClasses from "@/components/teacher/dashboard/RecentClasses";
import PerformanceChart from "@/components/teacher/dashboard/PerformanceChart";
import RecentActivity from "@/components/teacher/dashboard/RecentActivity";
import PageHeader from "@/components/shared/PageHeader";

export default function DashboardPage() {
    const today = new Date();
    const dayNames = [
        "Chủ Nhật",
        "Thứ Hai",
        "Thứ Ba",
        "Thứ Tư",
        "Thứ Năm",
        "Thứ Sáu",
        "Thứ Bảy",
    ];
    const dayName = dayNames[today.getDay()];
    const dateStr = today.toLocaleDateString("vi-VN", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });

    return (
        <div className="p-8 space-y-8">
            <PageHeader
                title="Chào mừng trở lại 👋"
                subtitle={`Hôm nay là ${dayName}, ${dateStr}`}
            />

            <StatsOverview />

            <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <RecentClasses />
                    <PerformanceChart />
                </div>

                <div className="space-y-8">
                    <RecentActivity />
                </div>
            </div>
        </div>
    );
}
