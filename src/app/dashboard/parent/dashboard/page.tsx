// src/app/parent/dashboard/page.tsx
"use client";

import HeaderParent from "@/components/parent/Header";
import QuickStats from "@/components/parent/QuickStats";
import MyChildren from "@/components/parent/MyChildren";
import AcademicPerformance from "@/components/parent/AcademicPerformance";
import RecentActivities from "@/components/parent/RecentActivities";
import UpcomingDeadlines from "@/components/parent/UpcomingDeadlines";
import AttendanceSummary from "@/components/parent/AttendanceSummary";
import TeacherContacts from "@/components/parent/TeacherContacts";
import MonthlyReport from "@/components/parent/MonthlyReport";

export default function ParentDashboardPage() {
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
        title="Chào mừng Phụ huynh! 👨‍👩‍👧"
        subtitle={`Theo dõi tiến độ học tập của con bạn - Hôm nay là ${formattedDate}`}
      />

      <QuickStats />

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <MyChildren />
          <AcademicPerformance />
          <RecentActivities />
        </div>
        <div className="space-y-8">
          <UpcomingDeadlines />
          <AttendanceSummary />
          <TeacherContacts />
        </div>
      </div>

      <MonthlyReport />
    </>
  );
}