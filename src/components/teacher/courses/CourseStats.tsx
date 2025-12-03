import { BookOpen, Users, TrendingUp, Star } from "lucide-react";

export default function CourseStats() {
  const stats = [
    {
      title: "Tổng số khóa học",
      value: "12",
      change: "+2",
      changeType: "increase",
      icon: <BookOpen className="h-5 w-5" />,
      color: "from-blue-500 to-blue-600"
    },
    {
      title: "Học sinh đang học",
      value: "384",
      change: "+28",
      changeType: "increase", 
      icon: <Users className="h-5 w-5" />,
      color: "from-purple-500 to-purple-600"
    },
    {
      title: "Tỷ lệ hoàn thành",
      value: "86%",
      change: "+5%",
      changeType: "increase",
      icon: <TrendingUp className="h-5 w-5" />,
      color: "from-green-500 to-green-600"
    },
    {
      title: "Đánh giá trung bình",
      value: "4.8",
      change: "+0.2",
      changeType: "increase",
      icon: <Star className="h-5 w-5" />,
      color: "from-yellow-500 to-yellow-600"
    }
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
              {stat.changeType === "increase" ? "↑" : "↓"} {stat.change}
            </span>
            <span className="text-white/80">so với tháng trước</span>
          </div>
        </div>
      ))}
    </div>
  );
}