// src/components/student/StatsOverview.tsx
export default function StatsOverview() {
    const stats = [
      { icon: "📖", color: "from-blue-500 to-blue-600", label: "Bài học", value: "24", sub: "↑ 5 bài mới tuần này" },
      { icon: "✍️", color: "from-purple-500 to-purple-600", label: "Bài tập", value: "12", sub: "8 đã nộp" },
      { icon: "⭐", color: "from-pink-500 to-pink-600", label: "Điểm TB", value: "8.5", sub: "↑ 0.3 so với tháng trước" },
      { icon: "🔥", color: "from-yellow-500 to-orange-500", label: "Ngày liên tiếp", value: "7", sub: "+2 so với tuần trước" },
    ];
  
    return (
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        {stats.map((s) => (
          <div
            key={s.label}
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
            <p className="text-sm text-white/80">{s.sub}</p>
          </div>
        ))}
      </div>
    );
  }
  