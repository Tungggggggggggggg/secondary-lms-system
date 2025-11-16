"use client";

import { useStudentAssignments } from "@/hooks/use-student-assignments";
import { useEffect, useMemo } from "react";
import Link from "next/link";

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

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-2xl font-extrabold text-gray-800 mb-6 flex items-center gap-2">
          🔔 Hoạt động gần đây
        </h2>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-20"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-2xl font-extrabold text-gray-800 mb-6 flex items-center gap-2">
          🔔 Hoạt động gần đây
        </h2>
        <div className="text-red-500 text-center py-4">
          Có lỗi xảy ra: {error}
        </div>
      </div>
    );
  }

  if (recentActivities.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-2xl font-extrabold text-gray-800 mb-6 flex items-center gap-2">
          🔔 Hoạt động gần đây
        </h2>
        <div className="text-center py-8 text-gray-500">
          <p>Chưa có hoạt động nào</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h2 className="text-2xl font-extrabold text-gray-800 mb-6 flex items-center gap-2">
        🔔 Hoạt động gần đây
      </h2>
      <div className="space-y-4">
        {recentActivities.map((act, index) => {
          const content = (
            <div key={index} className="flex gap-3">
              <div
                className={`w-10 h-10 bg-gradient-to-r ${act.color} rounded-full flex items-center justify-center text-white font-bold`}
              >
                {act.icon}
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-800">{act.text}</p>
                <p className="text-xs text-gray-500">{act.time}</p>
              </div>
            </div>
          );

          if (act.link) {
            return (
              <Link key={index} href={act.link} className="block hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors">
                {content}
              </Link>
            );
          }

          return content;
        })}
      </div>
    </div>
  );
}
  