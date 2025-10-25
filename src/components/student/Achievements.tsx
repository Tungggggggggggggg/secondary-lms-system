// src/components/student/Achievements.tsx
export default function Achievements() {
    const badges = [
      { icon: "📚", color: "from-yellow-400 to-yellow-500", title: "Học bá", desc: "100 bài học" },
      { icon: "⭐", color: "from-blue-400 to-blue-500", title: "Xuất sắc", desc: "Điểm TB > 8.5" },
      { icon: "💯", color: "from-purple-400 to-purple-500", title: "100% Hoàn thành", desc: "Tất cả bài tập" },
      { icon: "🔥", color: "from-pink-400 to-pink-500", title: "7 Ngày Streak", desc: "Học liên tục" },
    ];
  
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-2xl font-extrabold text-gray-800 mb-6 flex items-center gap-2">
          🏆 Thành tích
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {badges.map((b) => (
            <div
              key={b.title}
              className={`bg-gradient-to-br ${b.color} rounded-xl p-6 text-white text-center`}
            >
              <div className="text-4xl mb-2">{b.icon}</div>
              <h3 className="font-bold text-sm mb-1">{b.title}</h3>
              <p className="text-xs opacity-90">{b.desc}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }
  