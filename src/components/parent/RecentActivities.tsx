// src/components/parent/RecentActivities.tsx
export default function RecentActivities() {
    const activities = [
      {
        icon: "✅",
        color: "bg-green-100",
        title: "Đã nộp bài tập Lịch sử",
        time: "2 giờ trước",
        desc: "Bài tập chương 3: Chiến tranh thế giới",
        tag: { text: "Hoàn thành đúng hạn", color: "bg-green-100 text-green-700" },
      },
      {
        icon: "📊",
        color: "bg-blue-100",
        title: "Nhận điểm kiểm tra Địa lý",
        time: "1 ngày trước",
        desc: "Điểm: 9.0/10 - Xuất sắc! 🌟",
        tag: { text: "Điểm cao", color: "bg-blue-100 text-blue-700" },
      },
      {
        icon: "📖",
        color: "bg-purple-100",
        title: "Hoàn thành bài học Tiếng Anh",
        time: "2 ngày trước",
        desc: "Chương 5: Thì hiện tại hoàn thành",
        tag: { text: "Tiến độ tốt", color: "bg-purple-100 text-purple-700" },
      },
    ];
  
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-extrabold text-gray-800 flex items-center gap-2">
            📝 Hoạt động gần đây
          </h2>
          <a href="#" className="text-sm font-semibold text-purple-600 hover:text-purple-700">
            Xem tất cả →
          </a>
        </div>
  
        <div className="space-y-4">
          {activities.map((a) => (
            <div
              key={a.title}
              className="border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 ${a.color} rounded-xl flex items-center justify-center text-2xl flex-shrink-0`}
                >
                  {a.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-gray-900">{a.title}</h3>
                    <span className="text-xs text-gray-500">{a.time}</span>
                  </div>
                  <p className="text-sm text-gray-600">{a.desc}</p>
                  <div className="mt-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${a.tag.color}`}>
                      {a.tag.text}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  