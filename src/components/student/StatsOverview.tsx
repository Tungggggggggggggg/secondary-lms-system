"use client";

import useSWR from "swr";
import { StatsGrid, type StatItem } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, PencilLine, Star, Flame } from "lucide-react";
import { useEffect, useState } from "react";

type DashboardStats = {
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

const fetcher = async (url: string) => {
  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json().catch(() => ({ success: false }));
  if (!res.ok || json?.success === false) {
    const msg = json?.message || res.statusText || "Fetch error";
    throw new Error(msg);
  }
  return json as { success: true; data: DashboardStats };
};

export default function StatsOverview() {
  const { data, error, isLoading, mutate } = useSWR<{ success: true; data: DashboardStats }>(
    "/api/students/dashboard/stats",
    fetcher,
    { revalidateOnFocus: true, revalidateOnReconnect: true, refreshInterval: 30000 }
  );

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
        icon: <BookOpen className="h-5 w-5" />,
        color: "from-blue-300 to-indigo-200",
        label: "Bài học",
        value: "—",
        subtitle: "Lỗi tải dữ liệu",
      },
      {
        icon: <PencilLine className="h-5 w-5" />,
        color: "from-emerald-300 to-green-200",
        label: "Bài tập",
        value: "—",
        subtitle: "Lỗi tải dữ liệu",
      },
      {
        icon: <Star className="h-5 w-5" />,
        color: "from-pink-300 to-rose-200",
        label: "Điểm TB",
        value: "—",
        subtitle: "Lỗi tải dữ liệu",
      },
      {
        icon: <Flame className="h-5 w-5" />,
        color: "from-amber-300 to-orange-200",
        label: "Lớp học",
        value: "—",
        subtitle: "Lỗi tải dữ liệu",
      },
    ];

    return <StatsGrid items={errorItems} onItemClick={() => mutate()} />;
  }

  const items: StatItem[] = [
    {
      icon: <BookOpen className="h-5 w-5" />,
      color: "from-blue-300 to-indigo-200",
      label: "Bài học",
      value: stats.totalLessons.toString(),
      subtitle:
        stats.newLessonsThisWeek > 0
          ? `↑ ${stats.newLessonsThisWeek} bài mới tuần này`
          : "Không có bài mới",
    },
    {
      icon: <PencilLine className="h-5 w-5" />,
      color: "from-emerald-300 to-green-200",
      label: "Bài tập",
      value: stats.totalAssignments.toString(),
      subtitle: `${stats.submittedAssignments} đã nộp${
        stats.upcomingAssignments > 0 ? ` • ${stats.upcomingAssignments} sắp đến hạn` : ""
      }`,
    },
    {
      icon: <Star className="h-5 w-5" />,
      color: "from-pink-300 to-rose-200",
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
      icon: <Flame className="h-5 w-5" />,
      color: "from-amber-300 to-orange-200",
      label: "Lớp học",
      value: stats.totalClassrooms.toString(),
      subtitle:
        stats.newClassroomsThisWeek > 0
          ? `+${stats.newClassroomsThisWeek} lớp mới tuần này`
          : "Không có lớp mới",
    },
  ];

  return (
    <>
      <StatsGrid items={items} />
    </>
  );
}