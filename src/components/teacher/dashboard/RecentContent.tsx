export default function RecentClasses() {
    const classes = [
      {
        icon: "📜",
        color: "from-yellow-400 to-yellow-500",
        name: "Lịch sử 8A1",
        students: 32,
        code: "HS8A1X",
        days: "Thứ 2, 4, 6",
        time: "7:00 - 8:30",
        status: "Đang hoạt động",
        tag: "5 bài chưa chấm",
        tagColor: "bg-red-100 text-red-700",
      },
      {
        icon: "🗺️",
        color: "from-emerald-400 to-emerald-500",
        name: "Địa lý 9B2",
        students: 28,
        code: "DL9B2Y",
        days: "Thứ 3, 5, 7",
        time: "9:00 - 10:30",
        status: "Đang hoạt động",
        tag: "Tất cả đã chấm",
        tagColor: "bg-blue-100 text-blue-700",
      },
      {
        icon: "🗣️",
        color: "from-blue-400 to-blue-500",
        name: "Tiếng Anh 7C",
        students: 35,
        code: "EN7CZ",
        days: "Thứ 2, 4, 6",
        time: "13:00 - 14:30",
        status: "Đang hoạt động",
        tag: "2 bài chưa chấm",
        tagColor: "bg-yellow-100 text-yellow-700",
      },
    ];
  
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-extrabold text-gray-800 flex items-center gap-2">
            🏫 Lớp học gần đây
          </h2>
          <a
            href="#"
            className="text-sm font-semibold text-purple-600 hover:text-purple-700"
          >
            Xem tất cả →
          </a>
        </div>
        <div className="space-y-4">
          {classes.map((c, i) => (
            <div key={i} className="gradient-border rounded-xl p-5 hover-lift cursor-pointer">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 bg-gradient-to-r ${c.color} rounded-xl flex items-center justify-center text-xl`}
                  >
                    {c.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">{c.name}</h3>
                    <p className="text-sm text-gray-600">{c.students} học sinh</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-semibold mb-1">
                    {c.status}
                  </div>
                  <div className="text-xs text-gray-500">Mã: {c.code}</div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>📅 {c.days}</span>
                <span>⏰ {c.time}</span>
                <span className={`ml-auto ${c.tagColor} px-2 py-1 rounded-full text-xs font-semibold`}>
                  {c.tag}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  