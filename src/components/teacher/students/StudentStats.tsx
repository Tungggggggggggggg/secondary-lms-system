import type { ReactNode } from 'react';
import { Users, BarChart3, AlertTriangle, Target } from 'lucide-react';

type Props = {
  totalStudents: number;
  avgParticipation: number; // 0 - 100
  needSupportCount: number;
  avgGrade: number | null;
};

export default function StudentStats({
  totalStudents,
  avgParticipation,
  needSupportCount,
  avgGrade,
}: Props) {
  const stats: { title: string; value: string; icon: ReactNode; color: string }[] = [
    {
      title: "Tổng số học sinh",
      value: totalStudents.toString(),
      icon: <Users className="h-5 w-5" />,
      color: "from-blue-500 to-blue-600",
    },
    {
      title: "Tỷ lệ hoàn thành bài",
      value: `${Math.round(avgParticipation)}%`,
      icon: <BarChart3 className="h-5 w-5" />,
      color: "from-green-500 to-green-600",
    },
    {
      title: "Cần hỗ trợ",
      value: needSupportCount.toString(),
      icon: <AlertTriangle className="h-5 w-5" />,
      color: "from-yellow-500 to-yellow-600",
    },
    {
      title: "Điểm trung bình",
      value: avgGrade !== null ? avgGrade.toFixed(1) : "-",
      icon: <Target className="h-5 w-5" />,
      color: "from-purple-500 to-purple-600",
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
          <div className="flex items-center gap-2 text-sm">
            <span className="bg-white/20 px-2 py-1 rounded-full">
              {/* Add a default changeType and change value */}
              {"↑"} {0}
            </span>
            <span className="text-white/80">so với tháng trước</span>
          </div>
        </div>
      ))}
    </div>
  );
}