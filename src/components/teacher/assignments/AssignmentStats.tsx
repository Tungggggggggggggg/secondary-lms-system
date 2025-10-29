export default function AssignmentStats() {
  const stats = [
    {
      title: "Tổng số bài tập",
      value: "45",
      change: "+8",
      changeType: "increase",
      icon: "📝",
      color: "from-blue-500 to-blue-600"
    },
    {
      title: "Cần chấm điểm",
      value: "28",
      change: "+12",
      changeType: "increase",
      icon: "✍️",
      color: "from-red-500 to-red-600"
    },
    {
      title: "Tỷ lệ nộp bài",
      value: "92%",
      change: "+5%",
      changeType: "increase",
      icon: "📊",
      color: "from-green-500 to-green-600"
    },
    {
      title: "Điểm trung bình",
      value: "8.5",
      change: "+0.3",
      changeType: "increase",
      icon: "🎯",
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
            <span className="text-white/80">so với tuần trước</span>
          </div>
        </div>
      ))}
    </div>
  );
}