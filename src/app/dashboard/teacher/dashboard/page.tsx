"use client";

import StatsOverview from "@/components/teacher/dashboard/StatsOverview";
import RecentClasses from "@/components/teacher/dashboard/RecentClasses";
import PerformanceChart from "@/components/teacher/dashboard/PerformanceChart";
import RecentActivity from "@/components/teacher/dashboard/RecentActivity";
import PageHeader from "@/components/shared/PageHeader";
import { useSession } from "next-auth/react";

export default function DashboardPage() {
    const { data: session } = useSession();
    const user = session?.user as { fullname?: string; name?: string; email?: string } | undefined;
    const displayName =
        (user?.fullname && user.fullname.trim()) ||
        (user?.name && user.name.trim()) ||
        (user?.email ? user.email.split("@")[0] : "") ||
        "bạn";
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
                title={`Chào mừng trở lại, ${displayName} 👋`}
                subtitle={`Hôm nay là ${dayName}, ${dateStr}`}
                role="teacher"
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
