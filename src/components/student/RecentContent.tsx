// src/components/student/RecentContent.tsx
export default function RecentContent() {
    const contents = [
      { icon: "📜", color: "from-yellow-400 to-yellow-500", subject: "Lịch sử", title: "Chiến tranh thế giới lần 2", desc: "Tổng quan về cuộc chiến tranh", views: 156, likes: 25, comments: 8 },
      { icon: "🌍", color: "from-emerald-400 to-emerald-500", subject: "Địa lý", title: "Châu Á và châu Mỹ", desc: "Đặc điểm địa lý tự nhiên", views: 124, likes: 18, comments: 5 },
      { icon: "🇬🇧", color: "from-blue-400 to-blue-500", subject: "Tiếng Anh", title: "Thì hiện tại hoàn thành", desc: "Cách sử dụng và bài tập thực hành", views: 189, likes: 42, comments: 15 },
    ];
  
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 mt-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-extrabold text-gray-800 flex items-center gap-2">
            📚 Thư viện nội dung gần đây
          </h2>
          <a href="#" className="text-sm font-semibold text-purple-600 hover:text-purple-700">
            Xem tất cả →
          </a>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {contents.map((c) => (
            <div key={c.title} className="gradient-border rounded-xl p-5 hover-lift cursor-pointer">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`w-12 h-12 bg-gradient-to-r ${c.color} rounded-xl flex items-center justify-center text-xl`}
                >
                  {c.icon}
                </div>
                <div className="flex-1">
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-semibold ${
                      c.subject === "Lịch sử"
                        ? "bg-yellow-100 text-yellow-700"
                        : c.subject === "Địa lý"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {c.subject}
                  </span>
                </div>
              </div>
              <h3 className="font-bold text-gray-800 mb-2">{c.title}</h3>
              <p className="text-sm text-gray-600 mb-3">{c.desc}</p>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>👁️ {c.views} lượt xem</span>
                <span>⭐ {c.likes} thích</span>
                <span>💬 {c.comments} bình luận</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  