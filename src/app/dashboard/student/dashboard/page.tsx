// src/app/student/dashboard/page.tsx
"use client";

import Header from "@/components/student/Header";
import StatsOverview from "@/components/student/StatsOverview";
import MyClasses from "@/components/student/MyClasses";
import UpcomingAssignments from "@/components/student/UpcomingAssignments";
import RecentActivity from "@/components/student/RecentActivity";
import TeacherContacts from "@/components/student/TeacherContacts";
import Breadcrumb, { BreadcrumbItem } from "@/components/ui/breadcrumb";

export default function StudentDashboardPage() {
  // Breadcrumb items cho dashboard
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "Dashboard", href: "/dashboard/student/dashboard" },
  ];

  // Lấy ngày hiện tại
  const today = new Date();
  const dayNames = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
  const dayName = dayNames[today.getDay()];
  const dateStr = today.toLocaleDateString("vi-VN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <Breadcrumb items={breadcrumbItems} className="mb-4" />
      <Header
        title="Chào mừng trở lại! 👋"
        subtitle={`Hôm nay là ${dayName}, ${dateStr}`}
      />
      <StatsOverview />

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <MyClasses />
        </div>
        <div className="space-y-8">
          {/* <JoinClass /> */}
          <UpcomingAssignments />
          <RecentActivity />
          <TeacherContacts />
        </div>
      </div>
    </>
  );
}