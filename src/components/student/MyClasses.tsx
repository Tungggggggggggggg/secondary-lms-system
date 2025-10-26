// src/components/student/MyClasses.tsx
export default function MyClasses() {
    const classes = [
      {
        icon: "📜",
        color: "from-yellow-400 to-yellow-500",
        title: "Lịch sử 8A",
        teacher: "Thầy Nguyễn Văn An",
        progress: "67%",
        status: "Bài tập chờ làm",
        statusColor: "bg-yellow-100 text-yellow-700",
      },
      {
        icon: "🌍",
        color: "from-emerald-400 to-emerald-500",
        title: "Địa lý 9D",
        teacher: "Cô Trần Thị Bình",
        progress: "62%",
        status: "Đã hoàn thành",
        statusColor: "bg-green-100 text-green-700",
      },
      {
        icon: "🇬🇧",
        color: "from-blue-400 to-blue-500",
        title: "Tiếng Anh 7",
        teacher: "Cô Phạm Thị Lan",
        progress: "80%",
        status: "Cần ôn tập",
        statusColor: "bg-orange-100 text-orange-700",
      },
    ];
  
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-extrabold text-gray-800 flex items-center gap-2">
            🏫 Lớp học của tôi
          </h2>
          <a href="#" className="text-sm font-semibold text-purple-600 hover:text-purple-700">
            Xem tất cả →
          </a>
        </div>
  
        <div className="space-y-4">
          {classes.map((cls) => (
            <div key={cls.title} className="gradient-border rounded-xl p-5 hover-lift cursor-pointer">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 bg-gradient-to-r ${cls.color} rounded-xl flex items-center justify-center text-xl`}
                  >
                    {cls.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">{cls.title}</h3>
                    <p className="text-sm text-gray-600">{cls.teacher}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-semibold mb-1">
                    Đang học
                  </div>
                  <div className="text-xs text-gray-500">Tiến độ: {cls.progress}</div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>📖 8/12 bài học</span>
                <span>⏱️ 25 phút còn lại</span>
                <span className={`ml-auto px-2 py-1 rounded-full text-xs font-semibold ${cls.statusColor}`}>
                  {cls.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  