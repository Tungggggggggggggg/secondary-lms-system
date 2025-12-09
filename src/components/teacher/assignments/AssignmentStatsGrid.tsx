"use client";

import { useEffect, useState } from "react";
import { StatsGrid, type StatItem } from "@/components/shared";
import { NotebookText, PenLine, BarChart3, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AssignmentStatsGrid() {
  const [items, setItems] = useState<StatItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/teachers/assignments/stats", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok || json?.success === false) {
          throw new Error(json?.message || res.statusText || "Fetch error");
        }
        const data = json.data as {
          totalAssignments: number;
          needGrading: number;
          submitRate: number;
          averageGrade: number | null;
          totalSubmissions: number;
        };
        if (!mounted) return;
        const next: StatItem[] = [
          {
            icon: <NotebookText className="h-5 w-5" />,
            color: "from-blue-300 to-indigo-200",
            label: "Tổng bài tập",
            value: String(data.totalAssignments ?? 0),
            subtitle: `${data.totalSubmissions ?? 0} bài đã nộp`,
          },
          {
            icon: <PenLine className="h-5 w-5" />,
            color: "from-red-300 to-rose-200",
            label: "Cần chấm",
            value: String(data.needGrading ?? 0),
            subtitle: "Bài nộp chưa chấm",
          },
          {
            icon: <BarChart3 className="h-5 w-5" />,
            color: "from-green-300 to-emerald-200",
            label: "Tỷ lệ nộp",
            value: `${Math.round(data.submitRate ?? 0)}%`,
            subtitle: "Tổng quan toàn lớp",
          },
          {
            icon: <Target className="h-5 w-5" />,
            color: "from-blue-200 to-indigo-100",
            label: "Điểm TB",
            value: data.averageGrade != null ? Number(data.averageGrade).toFixed(1) : "Chưa có",
            subtitle: "TB các bài đã chấm",
          },
        ];
        setItems(next);
      } catch (e: any) {
        setError(e?.message || "Lỗi tải thống kê");
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-[140px] rounded-2xl" />
        ))}
      </div>
    );
  }
  if (error || !items) {
    const fallback: StatItem[] = [
      { icon: <NotebookText className="h-5 w-5" />, color: "from-blue-300 to-indigo-200", label: "Tổng bài tập", value: "N/A", subtitle: "Lỗi tải" },
      { icon: <PenLine className="h-5 w-5" />, color: "from-red-300 to-rose-200", label: "Cần chấm", value: "N/A", subtitle: "Lỗi tải" },
      { icon: <BarChart3 className="h-5 w-5" />, color: "from-green-300 to-emerald-200", label: "Tỷ lệ nộp", value: "N/A", subtitle: "Lỗi tải" },
      { icon: <Target className="h-5 w-5" />, color: "from-blue-200 to-indigo-100", label: "Điểm TB", value: "N/A", subtitle: "Lỗi tải" },
    ];
    return <StatsGrid items={fallback} />;
  }

  return <StatsGrid items={items} />;
}
