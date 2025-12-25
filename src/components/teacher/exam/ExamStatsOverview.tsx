"use client";

import type { StatItem } from "@/components/shared";
import { StatsGrid } from "@/components/shared";
import { Users, Clock, AlertTriangle, Shield } from "lucide-react";

interface ExamStatsOverviewProps {
  active: number;
  paused: number;
  suspicious: number;
  total: number;
}

export default function ExamStatsOverview({
  active,
  paused,
  suspicious,
  total,
}: ExamStatsOverviewProps) {
  const items: StatItem[] = [
    {
      icon: <Users className="h-5 w-5" />,
      color: "from-emerald-300 to-emerald-200",
      label: "Đang thi",
      value: String(active),
      subtitle: "Phiên đang hoạt động",
    },
    {
      icon: <Clock className="h-5 w-5" />,
      color: "from-amber-300 to-yellow-200",
      label: "Tạm dừng",
      value: String(paused),
      subtitle: "Phiên tạm dừng",
    },
    {
      icon: <AlertTriangle className="h-5 w-5" />,
      color: "from-rose-300 to-red-200",
      label: "Cảnh báo",
      value: String(suspicious),
      subtitle: "Hoạt động đáng ngờ",
    },
    {
      icon: <Shield className="h-5 w-5" />,
      color: "from-blue-300 to-indigo-200",
      label: "Tổng phiên",
      value: String(total),
      subtitle: "Tất cả phiên được ghi nhận",
    },
  ];

  return <StatsGrid items={items} />;
}
