"use client";

import useSWR from "swr";

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

  const statsList = [
    {
      color: "from-blue-500 to-blue-600",
      icon: "👨‍👩‍👧",
      value: childrenCount.toString(),
      label: "Con được liên kết",
      change: childrenCount > 0 ? "✓" : "—",
      desc: childrenCount > 0 ? "Đã liên kết" : "Chưa có",
    },
    {
      color: "from-green-500 to-green-600",
      icon: "✅",
      value: stats ? stats.totalGraded.toString() : "—",
      label: "Đã chấm",
      change: stats && stats.totalGraded > 0 ? "✓" : "—",
      desc: stats ? `${stats.totalGraded} bài đã chấm` : "Chưa có dữ liệu",
    },
    {
      color: "from-yellow-500 to-orange-500",
      icon: "⭐",
      value: stats && stats.overallAverage > 0 ? stats.overallAverage.toFixed(1) : "—",
      label: "Điểm trung bình",
      change:
        stats && stats.averageChange > 0
          ? `↑${stats.averageChange.toFixed(1)}`
          : stats && stats.averageChange < 0
          ? `↓${Math.abs(stats.averageChange).toFixed(1)}`
          : "—",
      desc:
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
      change: stats && stats.totalPending > 0 ? `${stats.totalPending} chờ` : "—",
      desc: stats ? `${stats.totalSubmissions} bài đã nộp` : "Chưa có dữ liệu",
    },
  ];

  return (
    <div className="grid md:grid-cols-4 gap-6 mb-8">
      {statsList.map((item) => (
        <div
          key={item.label}
          className={`bg-gradient-to-br ${item.color} rounded-2xl p-6 text-white hover-lift`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center text-2xl">
              {item.icon}
            </div>
            <div className="text-right">
              <div className="text-3xl font-extrabold">{item.value}</div>
              <div className="text-white/80 text-sm">{item.label}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="bg-white/20 px-2 py-1 rounded-full">{item.change}</span>
            <span className="text-white/80">{item.desc}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
  