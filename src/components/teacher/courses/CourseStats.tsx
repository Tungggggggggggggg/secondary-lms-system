"use client";

import { BookOpen, Layers, School, Clock } from "lucide-react";
import { StatsGrid, type StatItem, KpiSkeletonGrid } from "@/components/shared";

type CourseListItem = {
  id: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    lessons?: number;
    classrooms?: number;
  };
};

export default function CourseStats({
  courses,
  isLoading,
}: {
  courses: CourseListItem[];
  isLoading: boolean;
}) {
  const totalCourses = courses.length;
  const totalLessons = courses.reduce((acc, c) => acc + (c._count?.lessons ?? 0), 0);
  const totalClassrooms = courses.reduce((acc, c) => acc + (c._count?.classrooms ?? 0), 0);
  const latestUpdatedAt = courses.reduce<string | null>((acc, c) => {
    if (!acc) return c.updatedAt;
    return new Date(c.updatedAt).getTime() > new Date(acc).getTime() ? c.updatedAt : acc;
  }, null);

  const latestUpdatedLabel = latestUpdatedAt
    ? new Date(latestUpdatedAt).toLocaleDateString("vi-VN")
    : "—";

  if (isLoading) {
    return <KpiSkeletonGrid count={4} />;
  }

  const items: StatItem[] = [
    {
      icon: <BookOpen className="h-5 w-5" />,
      color: "from-blue-300 to-indigo-200",
      label: "Khóa học",
      value: String(totalCourses),
      subtitle: "Tổng số khóa học",
    },
    {
      icon: <Layers className="h-5 w-5" />,
      color: "from-emerald-300 to-green-200",
      label: "Bài học",
      value: String(totalLessons),
      subtitle: "Tổng số bài học",
    },
    {
      icon: <School className="h-5 w-5" />,
      color: "from-violet-300 to-purple-200",
      label: "Lớp",
      value: String(totalClassrooms),
      subtitle: "Số lớp đang dùng",
    },
    {
      icon: <Clock className="h-5 w-5" />,
      color: "from-amber-300 to-orange-200",
      label: "Cập nhật",
      value: latestUpdatedLabel,
      subtitle: "Gần nhất",
    },
  ];

  return <StatsGrid items={items} />;
}