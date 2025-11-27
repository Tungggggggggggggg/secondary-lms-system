"use client";

import useSWR from "swr";
import StatsGrid, { type StatItem } from "@/components/shared/StatsGrid";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function QuickStats() {
  interface ParentStudentRelationship {
    id: string;
    studentId: string;
    student: {
      id: string;
      email: string;
      fullname: string;
      role: string;
    };
  }

  const { data: childrenData, isLoading: childrenLoading } = useSWR<{
    success?: boolean;
    items?: ParentStudentRelationship[];
    total?: number;
  }>("/api/parent/children", fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  const { data: statsData, isLoading: statsLoading } = useSWR<{
    success?: boolean;
    data?: {
      totalChildren: number;
      totalSubmissions: number;
      totalGraded: number;
      totalPending: number;
      overallAverage: number;
      averageChange: number;
      upcomingAssignments: number;
    };
  }>("/api/parent/dashboard/stats", fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  const childrenCount = (childrenData?.success && childrenData?.total) ? childrenData.total : 0;
  const stats = statsData?.data;

  if (childrenLoading || statsLoading) {
    return (
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-gray-200 rounded-2xl p-6 animate-pulse"
            style={{ height: "140px" }}
          />
        ))}
      </div>
    );
  }

  const items: StatItem[] = [
    {
      color: "from-blue-500 to-blue-600",
      icon: "👨‍👩‍👧",
      value: childrenCount.toString(),
      label: "Con được liên kết",
      pillText: childrenCount > 0 ? "✓" : "—",
      subtitle: childrenCount > 0 ? "Đã liên kết" : "Chưa có",
    },
    {
      color: "from-green-500 to-green-600",
      icon: "✅",
      value: stats ? stats.totalGraded.toString() : "—",
      label: "Đã chấm",
      pillText: stats && stats.totalGraded > 0 ? "✓" : "—",
      subtitle: stats ? `${stats.totalGraded} bài đã chấm` : "Chưa có dữ liệu",
    },
    {
      color: "from-yellow-500 to-orange-500",
      icon: "⭐",
      value: stats && stats.overallAverage > 0 ? stats.overallAverage.toFixed(1) : "—",
      label: "Điểm trung bình",
      pillText:
        stats && stats.averageChange > 0
          ? `↑${stats.averageChange.toFixed(1)}`
          : stats && stats.averageChange < 0
          ? `↓${Math.abs(stats.averageChange).toFixed(1)}`
          : "—",
      subtitle:
        stats && stats.averageChange !== 0
          ? `So với tháng trước`
          : stats && stats.overallAverage > 0
          ? "Điểm trung bình"
          : "Chưa có điểm",
    },
    {
      color: "from-pink-500 to-purple-500",
      icon: "📊",
      value: stats ? stats.totalSubmissions.toString() : "—",
      label: "Tổng bài nộp",
      pillText: stats && stats.totalPending > 0 ? `${stats.totalPending} chờ` : "—",
      subtitle: stats ? `${stats.totalSubmissions} bài đã nộp` : "Chưa có dữ liệu",
    },
  ];

  return <StatsGrid items={items} />;
}