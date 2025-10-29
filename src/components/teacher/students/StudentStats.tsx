export default function StudentStats() {
  const stats = [
    {
      title: "Tổng số học sinh",
      value: "384",
      change: "+12",
      changeType: "increase",
      icon: "👥",
      color: "from-blue-500 to-blue-600"
    },
    {
      title: "Tỷ lệ tham gia",
      value: "95%",
      change: "+2%",
      changeType: "increase",
      icon: "📊",
      color: "from-green-500 to-green-600"
    },
    {
      title: "Cần hỗ trợ",
      value: "15",
      change: "-3",
      changeType: "decrease",
      icon: "⚠️",
      color: "from-yellow-500 to-yellow-600"
    },
    {
      title: "Điểm trung bình",
      value: "8.2",
      change: "+0.3",
      changeType: "increase",
      icon: "🎯",
      color: "from-purple-500 to-purple-600"
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