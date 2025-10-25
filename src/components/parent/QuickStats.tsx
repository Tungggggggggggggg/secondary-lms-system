// src/components/parent/QuickStats.tsx
export default function QuickStats() {
    const stats = [
      {
        color: "from-blue-500 to-blue-600",
        icon: "📚",
        value: "12",
        label: "Khóa học",
        change: "↑ 3",
        desc: "Khóa mới tháng này",
      },
      {
        color: "from-green-500 to-green-600",
        icon: "✅",
        value: "85%",
        label: "Hoàn thành",
        change: "↑ 5%",
        desc: "So với tháng trước",
      },
      {
        color: "from-yellow-500 to-orange-500",
        icon: "⭐",
        value: "8.7",
        label: "Điểm trung bình",
        change: "↑ 0.5",
        desc: "Cải thiện tích cực",
      },
      {
        color: "from-pink-500 to-purple-500",
        icon: "🔥",
        value: "5",
        label: "Ngày liên tiếp",
        change: "+2",
        desc: "Tuần này",
      },
    ];
  
    return (
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        {stats.map((item) => (
          <div
            key={item.label}
            className={`bg-gradient-to-br ${item.color} rounded-2xl p-6 text-white hover-lift`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center text-2xl">
                {item.icon}
              </div>
              <div className="text-right">
                <div className="text-3xl font-extrabold">{item.value}</div>
                <div className="text-white/80 text-sm">{item.label}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="bg-white/20 px-2 py-1 rounded-full">{item.change}</span>
              <span className="text-white/80">{item.desc}</span>
            </div>
          </div>
        ))}
      </div>
    );
  }
  