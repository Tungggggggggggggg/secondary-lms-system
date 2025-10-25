export default function RecentContent() {
    const contents = [
      { icon: "📜", subject: "Lịch sử", title: "Chiến tranh Việt Nam 1945-1975", desc: "Tổng quan về cuộc kháng chiến chống Pháp và Mỹ", color: "yellow", views: 1234, likes: 25, comments: 8 },
      { icon: "🗺️", subject: "Địa lý", title: "Khí hậu Đông Nam Á", desc: "Đặc điểm khí hậu nhiệt đới gió mùa", color: "emerald", views: 856, likes: 18, comments: 5 },
      { icon: "🗣️", subject: "Tiếng Anh", title: "Present Perfect Tense", desc: "Cách sử dụng và bài tập thực hành", color: "blue", views: 2145, likes: 42, comments: 15 },
    ];
  
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 mt-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-extrabold text-gray-800 flex items-center gap-2">📚 Thư viện nội dung gần đây</h2>
          <a href="#" className="text-sm font-semibold text-purple-600 hover:text-purple-700">
            Xem tất cả →
          </a>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {contents.map((c, i) => (
            <div key={i} className="gradient-border rounded-xl p-5 hover-lift cursor-pointer">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-12 h-12 bg-gradient-to-r from-${c.color}-400 to-${c.color}-500 rounded-xl flex items-center justify-center text-xl`}>
                  {c.icon}
                </div>
                <div className="flex-1">
                  <span className={`text-xs bg-${c.color}-100 text-${c.color}-700 px-2 py-1 rounded-full font-semibold`}>
                    {c.subject}
                  </span>
                </div>
              </div>
              <h3 className="font-bold text-gray-800 mb-2">{c.title}</h3>
              <p className="text-sm text-gray-600 mb-3">{c.desc}</p>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>👁️ {c.views.toLocaleString()} lượt xem</span>
                <span>⭐ {c.likes} thích</span>
                <span>💬 {c.comments} bình luận</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  