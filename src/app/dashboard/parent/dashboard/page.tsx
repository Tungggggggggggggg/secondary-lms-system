// src/app/parent/dashboard/page.tsx
import HeaderParent from "@/components/parent/Header";
import ChildSelector from "@/components/parent/ChildSelector";
import QuickStats from "@/components/parent/QuickStats";
import AcademicPerformance from "@/components/parent/AcademicPerformance";
import RecentActivities from "@/components/parent/RecentActivities";
import UpcomingDeadlines from "@/components/parent/UpcomingDeadlines";
import AttendanceSummary from "@/components/parent/AttendanceSummary";
import TeacherContacts from "@/components/parent/TeacherContacts";
import MonthlyReport from "@/components/parent/MonthlyReport";

export default function ParentDashboardPage() {
  return (
    <>
      <HeaderParent
        title="Chào mừng Phụ huynh! 👨‍👩‍👧"
        subtitle="Theo dõi tiến độ học tập của con bạn - Hôm nay là Thứ Sáu, 24 tháng 10, 2025"
      />

      <ChildSelector />
      <QuickStats />

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
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
