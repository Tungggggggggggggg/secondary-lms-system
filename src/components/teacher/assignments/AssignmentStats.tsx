import { useAssignments } from "@/hooks/use-assignments";

// Helper tính toán stats từ assignment data
function calcStats(assignments: ReturnType<typeof useAssignments>["assignments"]) {
  // Tổng số
  const total = assignments.length;

  // Tổng số bài cần chấm điểm: tạm lấy số assignment có submissions > 0
  let needGrade = 0;
  let totalSubmissions = 0, totalPossible = 0, sumGrades = 0, gradedCount = 0;
  assignments.forEach(a => {
    const submissions = a._count?.submissions ?? 0;
    if (submissions > 0) needGrade++;
    totalSubmissions += submissions;
    // Tổng submissions và điểm số (nâng cấp sau nếu API trả chi tiết hơn)
  });
  // Tỷ lệ nộp: (do chưa đủ data, tạm chỉ lấy tổng nộp/ tổng số assignment)
  const submitRate = total > 0 ? Math.round((totalSubmissions / (total*35)) *100) : 0;
  // Điểm trung bình - giả lập
  const avgScore = (sumGrades && gradedCount) ? (sumGrades/gradedCount).toFixed(1) : 'NA';
  return {
    total,
    needGrade,
    submitRate,
    avgScore
  };
}

export default function AssignmentStats() {
  const { assignments, loading, error, refresh } = useAssignments();
  if (loading) return <div className="py-10 text-gray-500 text-center">Đang tải thống kê...</div>;
  if (error) {
    console.error('[AssignmentStats] Lỗi:', error);
    return <div className="py-10 text-center text-red-500">Không lấy được thống kê! <button className='underline' onClick={refresh}>Thử lại</button></div>;
  }

  const stats = calcStats(assignments);
  const statsView = [
    {
      title: "Tổng số bài tập",
      value: stats.total,
      change: "",
      icon: "📝",
      color: "from-blue-500 to-blue-600"
    },
    {
      title: "Cần chấm điểm",
      value: stats.needGrade,
      change: "",
      icon: "✍️",
      color: "from-red-500 to-red-600"
    },
    {
      title: "Tỷ lệ nộp bài",
      value: `${stats.submitRate}%`,
      change: "",
      icon: "📊",
      color: "from-green-500 to-green-600"
    },
    {
      title: "Điểm trung bình",
      value: stats.avgScore,
      change: "",
      icon: "🎯",
      color: "from-yellow-500 to-yellow-600"
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
            {stat.change && <span className="bg-white/20 px-2 py-1 rounded-full">{stat.change}</span>}
            <span className="text-white/80">so với tuần trước</span>
          </div>
        </div>
      ))}
    </div>
  );
}