// src/app/student/dashboard/page.tsx
import Header from "@/components/student/Header";
import QuickActions from "@/components/student/QuickActions";
import StatsOverview from "@/components/student/StatsOverview";
import MyClasses from "@/components/student/MyClasses";
import UpcomingAssignments from "@/components/student/UpcomingAssignments";
import RecentActivity from "@/components/student/RecentActivity";
import WeeklyGoals from "@/components/student/WeeklyGoals";
import JoinClass from "@/components/student/JoinClass";

export default function StudentDashboardPage() {
  return (
    <>
      <Header
        title="Chào mừng trở lại! 👋"
        subtitle="Hôm nay là Thứ Sáu, 24 tháng 10, 2025"
      />
      <QuickActions />
      <StatsOverview />

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <MyClasses />
        </div>
        <div className="space-y-8">
          {/* <JoinClass /> */}
          <UpcomingAssignments />
          <RecentActivity />
   
        </div>
      </div>
    </>
  );
}