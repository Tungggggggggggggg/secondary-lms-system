// src/app/student/dashboard/page.tsx
"use client";

import Header from "@/components/student/Header";
import StatsOverview from "@/components/student/StatsOverview";
import MyClasses from "@/components/student/MyClasses";
import UpcomingAssignments from "@/components/student/UpcomingAssignments";
import RecentActivity from "@/components/student/RecentActivity";
import { useSession } from "next-auth/react";

export default function StudentDashboardPage() {
  const { data: session } = useSession();
  const user = session?.user as { fullname?: string; name?: string; email?: string } | undefined;
  const displayName =
    (user?.fullname && user.fullname.trim()) ||
    (user?.name && user.name.trim()) ||
    (user?.email ? user.email.split("@")[0] : "") ||
    "bạn";

  // Lấy ngày hiện tại
  const today = new Date();
  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  const formattedDate = today.toLocaleDateString("vi-VN", dateOptions);

  return (
    <>
      <Header
        title={`Chào mừng trở lại, ${displayName} 👋`}
        subtitle={`Quản lý học tập của bạn - Hôm nay là ${formattedDate}`}
      />

      <StatsOverview />

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <MyClasses />
          <RecentActivity />
        </div>
        <div className="space-y-8">
          <UpcomingAssignments />
        </div>
      </div>
    </>
  );
}