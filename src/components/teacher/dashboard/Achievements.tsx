export default function Achievements() {
    const items = [
      { icon: "🌟", title: "Top Educator", desc: "Tháng 10/2025" },
      { icon: "📚", title: "50+ Bài giảng", desc: "Đóng góp tích cực" },
      { icon: "💯", title: "90% Hài lòng", desc: "Đánh giá học sinh" },
      { icon: "⚡", title: "15 Ngày Streak", desc: "Hoạt động liên tục" },
    ];
  
    return (
      <div className="mt-8 bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 rounded-2xl p-8 text-white">
        <div className="text-center mb-6">
          <div className="text-6xl mb-3 animate-float">🏆</div>
          <h2 className="text-2xl font-extrabold mb-2">Thành tích nổi bật!</h2>
          <p className="text-white/90">Bạn đã đạt được nhiều cột mốc quan trọng</p>
        </div>
        <div className="grid md:grid-cols-4 gap-4">
          {items.map((a, i) => (
            <div key={i} className="bg-white/20 backdrop-blur-md rounded-xl p-4 text-center">
              <div className="text-3xl mb-2">{a.icon}</div>
              <div className="font-bold">{a.title}</div>
              <div className="text-xs text-white/80">{a.desc}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  