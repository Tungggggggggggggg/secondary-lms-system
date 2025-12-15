"use client";

import { BookOpen, Layers, School, Clock } from "lucide-react";

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

  const stats = [
    {
      title: "Tổng số khóa học",
      value: isLoading ? "—" : String(totalCourses),
      icon: <BookOpen className="h-5 w-5" />,
      color: "from-blue-500 to-blue-600",
    },
    {
      title: "Tổng số bài học",
      value: isLoading ? "—" : String(totalLessons),
      icon: <Layers className="h-5 w-5" />,
      color: "from-emerald-500 to-green-600",
    },
    {
      title: "Số lớp đang sử dụng",
      value: isLoading ? "—" : String(totalClassrooms),
      icon: <School className="h-5 w-5" />,
      color: "from-purple-500 to-violet-600",
    },
    {
      title: "Cập nhật gần nhất",
      value: isLoading ? "—" : latestUpdatedLabel,
      icon: <Clock className="h-5 w-5" />,
      color: "from-amber-500 to-orange-600",
    },
  ];

  return (
    <div className="grid md:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, idx) => (
        <div
          key={idx}
          className={`bg-gradient-to-br ${stat.color} rounded-2xl p-6 text-white hover-lift`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center text-2xl">
              {stat.icon}
            </div>
            <div className="text-right">
              <div className="text-3xl font-extrabold">{stat.value}</div>
              <div className="text-white/80 text-sm">{stat.title}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}