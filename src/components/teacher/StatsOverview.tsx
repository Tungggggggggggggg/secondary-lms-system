export default function StatsOverview() {
    const stats = [
      {
        color: "from-blue-500 to-blue-600",
        icon: "👥",
        value: "384",
        label: "Học sinh",
        change: "↑ 12%",
        note: "so với tháng trước",
      },
      {
        color: "from-purple-500 to-purple-600",
        icon: "🏫",
        value: "12",
        label: "Lớp học",
        change: "↑ 2",
        note: "lớp mới tuần này",
      },
      {
        color: "from-pink-500 to-pink-600",
        icon: "📚",
        value: "56",
        label: "Bài giảng",
        change: "↑ 8",
        note: "bài mới tháng này",
      },
      {
        color: "from-yellow-500 to-orange-500",
        icon: "✍️",
        value: "28",
        label: "Bài tập chờ",
        change: "!",
        note: "cần chấm điểm",
      },
    ];
  
    return (
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        {stats.map((s, idx) => (
          <div
            key={idx}
            className={`bg-gradient-to-br ${s.color} rounded-2xl p-6 text-white hover-lift`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center text-2xl">
                {s.icon}
              </div>
              <div className="text-right">
                <div className="text-3xl font-extrabold">{s.value}</div>
                <div className="text-white/80 text-sm">{s.label}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="bg-white/20 px-2 py-1 rounded-full">{s.change}</span>
              <span className="text-white/80">{s.note}</span>
            </div>
          </div>
        ))}
      </div>
    );
  }
  