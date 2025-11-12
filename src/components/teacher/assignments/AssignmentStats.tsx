import { useAssignments } from "@/hooks/use-assignments";
import { useEffect, useState } from "react";

export default function AssignmentStats() {
  const { assignments, loading, error, refresh } = useAssignments();
  const [stats, setStats] = useState<any>(null);
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
    return <div className="py-10 text-gray-500 text-center">Đang tải thống kê...</div>;
  }
  
  if (error || statsError) {
    console.error('[AssignmentStats] Lỗi:', error || statsError);
    return (
      <div className="py-10 text-center text-red-500">
        Không lấy được thống kê! 
        <button className='underline ml-2' onClick={refresh}>
          Thử lại
        </button>
      </div>
    );
  }

  if (!stats) {
    return <div className="py-10 text-gray-500 text-center">Không có dữ liệu thống kê</div>;
  }

  const statsView = [
    {
      title: "Tổng số bài tập",
      value: stats.totalAssignments || 0,
      change: "",
      icon: "📝",
      color: "from-blue-500 to-blue-600",
      subtitle: `${stats.assignmentsInClassrooms || 0} đã giao cho lớp`
    },
    {
      title: "Cần chấm điểm",
      value: stats.needGrading || 0,
      change: "",
      icon: "✍️",
      color: "from-red-500 to-red-600",
      subtitle: `${stats.totalSubmissions || 0} bài đã nộp`
    },
    {
      title: "Tỷ lệ nộp bài",
      value: `${stats.submitRate || 0}%`,
      change: "",
      icon: "📊",
      color: "from-green-500 to-green-600",
      subtitle: `${stats.totalStudents || 0} học sinh tổng`
    },
    {
      title: "Điểm trung bình",
      value: stats.averageGrade ? stats.averageGrade.toFixed(1) : 'Chưa có',
      change: "",
      icon: "🎯",
      color: "from-yellow-500 to-yellow-600",
      subtitle: `${stats.gradedSubmissions || 0} bài đã chấm`
    },
  ];

  return (
    <div className="grid md:grid-cols-4 gap-6 mb-8">
      {statsView.map((stat, idx) => (
        <div key={idx} className={`bg-gradient-to-br ${stat.color} rounded-2xl p-6 text-white hover-lift`}>
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center text-2xl">
              {stat.icon}
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
      ))}
    </div>
  );
}