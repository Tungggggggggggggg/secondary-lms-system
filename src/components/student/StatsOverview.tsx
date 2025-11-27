"use client";

import useSWR from "swr";
import StatsGrid, { type StatItem } from "@/components/shared/StatsGrid";
import { Skeleton } from "@/components/ui/skeleton";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function StatsOverview() {
  const { data, error, isLoading } = useSWR<{
    success?: boolean;
    data?: {
      totalClassrooms: number;
      newClassroomsThisWeek: number;
      totalAssignments: number;
      submittedAssignments: number;
      upcomingAssignments: number;
      averageGrade: number;
      gradeChange: number;
      totalLessons: number;
      newLessonsThisWeek: number;
    };
  }>("/api/students/dashboard/stats", fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  const stats = data?.data;

  if (isLoading) {
    return (
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-[140px] rounded-2xl" />
        ))}
      </div>
    );
  }

  if (error || !stats) {
    const errorItems: StatItem[] = [
      {
        icon: "📖",
        color: "from-blue-500 to-blue-600",
        label: "Bài học",
        value: "—",
        subtitle: "Lỗi tải dữ liệu",
      },
      {
        icon: "✍️",
        color: "from-purple-500 to-purple-600",
        label: "Bài tập",
        value: "—",
        subtitle: "Lỗi tải dữ liệu",
      },
      {
        icon: "⭐",
        color: "from-pink-500 to-pink-600",
        label: "Điểm TB",
        value: "—",
        subtitle: "Lỗi tải dữ liệu",
      },
      {
        icon: "🔥",
        color: "from-yellow-500 to-orange-500",
        label: "Lớp học",
        value: "—",
        subtitle: "Lỗi tải dữ liệu",
      },
    ];

    return <StatsGrid items={errorItems} />;
  }

  const items: StatItem[] = [
    {
      icon: "📖",
      color: "from-blue-500 to-blue-600",
      label: "Bài học",
      value: stats.totalLessons.toString(),
      subtitle:
        stats.newLessonsThisWeek > 0
          ? `↑ ${stats.newLessonsThisWeek} bài mới tuần này`
          : "Không có bài mới",
    },
    {
      icon: "✍️",
      color: "from-purple-500 to-purple-600",
      label: "Bài tập",
      value: stats.totalAssignments.toString(),
      subtitle: `${stats.submittedAssignments} đã nộp${
        stats.upcomingAssignments > 0 ? ` • ${stats.upcomingAssignments} sắp đến hạn` : ""
      }`,
    },
    {
      icon: "⭐",
      color: "from-pink-500 to-pink-600",
      label: "Điểm TB",
      value: stats.averageGrade > 0 ? stats.averageGrade.toFixed(1) : "—",
      subtitle:
        stats.gradeChange > 0
          ? `↑ ${stats.gradeChange.toFixed(1)} so với tháng trước`
          : stats.gradeChange < 0
          ? `↓ ${Math.abs(stats.gradeChange).toFixed(1)} so với tháng trước`
          : "Không thay đổi",
    },
    {
      icon: "🔥",
      color: "from-yellow-500 to-orange-500",
      label: "Lớp học",
      value: stats.totalClassrooms.toString(),
      subtitle:
        stats.newClassroomsThisWeek > 0
          ? `+${stats.newClassroomsThisWeek} lớp mới tuần này`
          : "Không có lớp mới",
    },
  ];

  return <StatsGrid items={items} />;
}