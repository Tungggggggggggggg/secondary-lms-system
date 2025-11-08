// src/components/parent/QuickStats.tsx
"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function QuickStats() {
  const { data } = useSWR<{
    success?: boolean;
    items?: any[];
    total?: number;
  }>("/api/parent/children", fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  const childrenCount = (data?.success && data?.total) ? data.total : 0;

  const stats = [
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
      value: "—",
      label: "Hoàn thành",
      change: "—",
      desc: "Tính năng sắp ra mắt",
    },
    {
      color: "from-yellow-500 to-orange-500",
      icon: "⭐",
      value: "—",
      label: "Điểm trung bình",
      change: "—",
      desc: "Tính năng sắp ra mắt",
    },
    {
      color: "from-pink-500 to-purple-500",
      icon: "📊",
      value: "—",
      label: "Thống kê",
      change: "—",
      desc: "Tính năng sắp ra mắt",
    },
  ];
  
    return (
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        {stats.map((item) => (
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
  