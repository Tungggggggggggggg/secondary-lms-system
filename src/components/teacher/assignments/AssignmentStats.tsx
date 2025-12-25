import { useAssignments } from "@/hooks/use-assignments";
import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, BarChart3, NotebookText, PenLine, Target } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export default function AssignmentStats() {
  const { assignments, loading, error, refresh } = useAssignments();
  interface Stats {
    totalAssignments?: number;
    assignmentsInClassrooms?: number;
    needGrading?: number;
    totalSubmissions?: number;
    submitRate?: number;
    totalStudents?: number;
    averageGrade?: number | null;
    gradedSubmissions?: number;
    [key: string]: unknown;
  }
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  // Fetch stats từ API
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setStatsLoading(true);
        setStatsError(null);

        const response = await fetch('/api/teachers/assignments/stats');
        if (!response.ok) {
          throw new Error('Failed to fetch stats');
        }

        const data = await response.json();
        if (data.success) {
          setStats(data.data);
        } else {
          throw new Error(data.message || 'Unknown error');
        }
      } catch (error) {
        console.error('[AssignmentStats] Error fetching stats:', error);
        setStatsError(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setStatsLoading(false);
      }
    };

    fetchStats();
  }, [assignments]); // Re-fetch when assignments change

  if (loading || statsLoading) {
    return (
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-2xl p-6 bg-white border border-gray-200 shadow-sm flex flex-col gap-4"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="w-14 h-14 rounded-xl" />
              <Skeleton className="h-8 w-16" />
            </div>
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    );
  }
  
  if (error || statsError) {
    console.error('[AssignmentStats] Lỗi:', error || statsError);
    return (
      <div className="mb-8">
        <Alert variant="destructive">
          <AlertTitle className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Không lấy được thống kê
          </AlertTitle>
          <AlertDescription className="mt-2 flex items-center justify-between gap-4">
            <span>{error || statsError}</span>
            <Button variant="outline" size="sm" onClick={refresh}>
              Thử lại
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!stats) {
    return <div className="py-10 text-gray-500 text-center">Không có dữ liệu thống kê</div>;
  }

  type StatItem = {
    title: string;
    value: number | string;
    Icon: LucideIcon;
    color: string;
    subtitle: string;
  };

  const statsView: StatItem[] = [
    {
      title: "Tổng số bài tập",
      value: stats.totalAssignments || 0,
      Icon: NotebookText,
      color: "from-blue-500 to-blue-600",
      subtitle: `${stats.assignmentsInClassrooms || 0} đã giao cho lớp`,
    },
    {
      title: "Cần chấm điểm",
      value: stats.needGrading || 0,
      Icon: PenLine,
      color: "from-red-500 to-red-600",
      subtitle: `${stats.totalSubmissions || 0} bài đã nộp`,
    },
    {
      title: "Tỷ lệ nộp bài",
      value: `${stats.submitRate || 0}%`,
      Icon: BarChart3,
      color: "from-green-500 to-green-600",
      subtitle: `${stats.totalStudents || 0} học sinh tổng`,
    },
    {
      title: "Điểm trung bình",
      value:
        stats.averageGrade !== null && stats.averageGrade !== undefined
          ? stats.averageGrade.toFixed(1)
          : "Chưa có",
      Icon: Target,
      color: "from-yellow-500 to-yellow-600",
      subtitle: `${stats.gradedSubmissions || 0} bài đã chấm`,
    },
  ];

  return (
    <div className="grid md:grid-cols-4 gap-6 mb-8">
      {statsView.map((stat, idx) => {
        const Icon = stat.Icon;
        return (
          <div key={idx} className={`bg-gradient-to-br ${stat.color} rounded-2xl p-6 text-white hover-lift`}>
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center text-2xl">
                <Icon className="h-7 w-7" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-extrabold">{stat.value}</div>
                <div className="text-white/80 text-sm">{stat.title}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-white/80">{stat.subtitle}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}