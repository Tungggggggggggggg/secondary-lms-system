export default function RecentActivity() {
    const activities = [
      { name: "Hoàng Minh", type: "Học sinh", action: "đã nộp bài tập", detail: "Lịch sử 8A1 - 5 phút trước", color: "from-blue-400 to-blue-500", short: "HS" },
      { name: "Phụ huynh Trần Thu", type: "Phụ huynh", action: "gửi tin nhắn", detail: "Lớp 9B2 - 15 phút trước", color: "from-purple-400 to-purple-500", short: "PH" },
      { name: "3 học sinh mới", type: "Học sinh", action: "tham gia lớp", detail: "Tiếng Anh 7C - 1 giờ trước", color: "from-green-400 to-green-500", short: "HS" },
      { name: "Chiến tranh VN", type: "Bài giảng", action: "được 25 lượt thích", detail: "Thư viện - 2 giờ trước", color: "from-yellow-400 to-yellow-500", short: "⭐" },
      { name: "8 bình luận mới", type: "Diễn đàn", action: "trong diễn đàn", detail: "Địa lý 9B2 - 3 giờ trước", color: "from-pink-400 to-pink-500", short: "💬" },
    ];
  
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-2xl font-extrabold text-gray-800 mb-6 flex items-center gap-2">🔔 Hoạt động gần đây</h2>
        <div className="space-y-4">
          {activities.map((a, i) => (
            <div key={i} className="flex gap-3">
              <div className={`w-10 h-10 bg-gradient-to-r ${a.color} rounded-full flex items-center justify-center text-white font-bold`}>
                {a.short}
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-800">
                  <span className="font-semibold">{a.name}</span> {a.action}
                </p>
                <p className="text-xs text-gray-500">{a.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  