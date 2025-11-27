"use client";

import { useStudentAssignments } from "@/hooks/use-student-assignments";
import { useEffect, useMemo } from "react";
import Link from "next/link";
import ActivityList, { type ActivityItem } from "@/components/shared/ActivityList";

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
      time: string;
      link?: string;
      timestamp: number; // Thêm timestamp để sắp xếp
    }> = [];

    assignments.forEach((assignment) => {
      if (assignment.submission) {
        const submittedAt = new Date(assignment.submission.submittedAt);
        const now = new Date();
        const diffMs = now.getTime() - submittedAt.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        let timeStr = "";
        if (diffHours < 1) {
          timeStr = "Vừa xong";
        } else if (diffHours < 24) {
          timeStr = `${diffHours} giờ trước`;
        } else if (diffDays === 1) {
          timeStr = "1 ngày trước";
        } else {
          timeStr = `${diffDays} ngày trước`;
        }

        if (assignment.submission.grade !== null) {
          activities.push({
            icon: "⭐",
            color: "from-green-400 to-green-500",
            text: `Nhận điểm ${assignment.submission.grade} - ${assignment.title}`,
            time: timeStr,
            link: `/dashboard/student/assignments/${assignment.id}`,
            timestamp: submittedAt.getTime(),
          });
        } else {
          activities.push({
            icon: "✅",
            color: "from-blue-400 to-blue-500",
            text: `Đã nộp bài tập ${assignment.title}`,
            time: timeStr,
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
    icon: act.icon,
    primaryText: act.text,
    secondaryText: act.time,
    href: act.link,
  }));

  return (
    <ActivityList
      title="🔔 Hoạt động gần đây"
      loading={isLoading}
      error={error ? String(error) : null}
      items={items}
      emptyMessage="Chưa có hoạt động nào"
    />
  );
}