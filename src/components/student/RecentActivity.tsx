// src/components/student/RecentActivity.tsx
export default function RecentActivity() {
    const activities = [
      { icon: "✅", color: "from-blue-400 to-blue-500", text: "Đã nộp bài tập Lịch sử chương 3", time: "2 giờ trước" },
      { icon: "⭐", color: "from-green-400 to-green-500", text: "Nhận điểm 9.5 Quiz Tiếng Anh", time: "1 ngày trước" },
      { icon: "📚", color: "from-purple-400 to-purple-500", text: "Hoàn thành bài học Địa lý Châu Á", time: "2 ngày trước" },
      { icon: "🔥", color: "from-yellow-400 to-yellow-500", text: "Streak 7 ngày! Học liên tục", time: "3 ngày trước" },
    ];
  
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-2xl font-extrabold text-gray-800 mb-6 flex items-center gap-2">
          🔔 Hoạt động gần đây
        </h2>
        <div className="space-y-4">
          {activities.map((act) => (
            <div key={act.text} className="flex gap-3">
              <div
                className={`w-10 h-10 bg-gradient-to-r ${act.color} rounded-full flex items-center justify-center text-white font-bold`}
              >
                {act.icon}
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-800">{act.text}</p>
                <p className="text-xs text-gray-500">{act.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  