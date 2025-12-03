// src/app/parent/dashboard/page.tsx
"use client";

import HeaderParent from "@/components/parent/Header";
import QuickStats from "@/components/parent/QuickStats";
import MyChildren from "@/components/parent/MyChildren";
import AcademicPerformance from "@/components/parent/AcademicPerformance";
import UpcomingEvents from "@/components/parent/UpcomingEvents";
import QuickActions from "@/components/parent/QuickActions";
import { useSession } from "next-auth/react";

export default function ParentDashboardPage() {
  const { data: session } = useSession();
  const user = session?.user as { fullname?: string; name?: string; email?: string } | undefined;
  const displayName =
    (user?.fullname && user.fullname.trim()) ||
    (user?.name && user.name.trim()) ||
    (user?.email ? user.email.split("@")[0] : "") ||
    "bạn";
  const currentDate = new Date();
  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  const formattedDate = currentDate.toLocaleDateString("vi-VN", dateOptions);

  return (
    <>
      <HeaderParent
        title={`Chào mừng trở lại, ${displayName} 👋`}
        subtitle={`Theo dõi tiến độ học tập của con bạn - Hôm nay là ${formattedDate}`}
      />

      <QuickStats />

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <MyChildren />
          <AcademicPerformance />
        </div>
        <div className="space-y-8">
          <UpcomingEvents />
          <QuickActions />
        </div>
      </div>
    </>
  );
}