"use client";

import { useStudentAssignments } from "@/hooks/use-student-assignments";
import { useEffect, useMemo } from "react";
import Link from "next/link";
import ActivityList, { type ActivityItem } from "@/components/shared/ActivityList";
import TimeAgo from "@/components/shared/TimeAgo";
import { Star, CheckCircle, Bell } from "lucide-react";

export default function RecentActivity() {
  const { assignments, isLoading, error, fetchAllAssignments } = useStudentAssignments();

  useEffect(() => {
    fetchAllAssignments();
  }, [fetchAllAssignments]);

  // Lấy các hoạt động gần đây từ submissions
  const recentActivities = useMemo(() => {
    if (!assignments || assignments.length === 0) return [];

    const activities: Array<{
      icon: string;
      color: string;
      text: string;
      submittedAt: Date;
      link?: string;
      timestamp: number; // Thêm timestamp để sắp xếp
    }> = [];

    assignments.forEach((assignment) => {
      if (assignment.submission) {
        const submittedAt = new Date(assignment.submission.submittedAt);

        if (assignment.submission.grade !== null) {
          activities.push({
            icon: "⭐",
            color: "from-green-400 to-green-500",
            text: `Nhận điểm ${assignment.submission.grade} - ${assignment.title}`,
            submittedAt,
            link: `/dashboard/student/assignments/${assignment.id}`,
            timestamp: submittedAt.getTime(),
          });
        } else {
          activities.push({
            icon: "✅",
            color: "from-blue-400 to-blue-500",
            text: `Đã nộp bài tập ${assignment.title}`,
            submittedAt,
            link: `/dashboard/student/assignments/${assignment.id}`,
            timestamp: submittedAt.getTime(),
          });
        }
      }
    });

    // Sắp xếp theo thời gian (mới nhất trước)
    activities.sort((a, b) => b.timestamp - a.timestamp);

    return activities.slice(0, 5); // Chỉ lấy 5 hoạt động gần nhất
  }, [assignments]);

  const items: ActivityItem[] = recentActivities.map((act, index) => ({
    id: index,
    color: act.color,
    icon: act.icon === "⭐" ? <Star className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />,
    primaryText: act.text,
    secondaryText: <TimeAgo date={act.submittedAt} short />,
    href: act.link,
    status: act.icon === "⭐" ? "graded" : "submitted",
  }));

  return (
    <ActivityList
      className="student-border"
      title={
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-green-600" />
          <span>Hoạt động gần đây</span>
        </div>
      }
      loading={isLoading}
      error={error ? String(error) : null}
      items={items}
      emptyMessage="Chưa có hoạt động nào"
    />
  );
}