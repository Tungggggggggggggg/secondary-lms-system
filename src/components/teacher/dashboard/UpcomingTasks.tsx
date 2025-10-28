export default function UpcomingTasks() {
    const tasks = [
      {
        title: "Chấm bài kiểm tra giữa kỳ",
        detail: "Lịch sử 8A1 - 32 bài",
        tag: "KHẨN CẤP",
        color: "red",
        date: "Hôm nay",
      },
      {
        title: "Họp phụ huynh trực tuyến",
        detail: "Lớp 9B2 - 19:00",
        tag: "QUAN TRỌNG",
        color: "yellow",
        date: "Mai",
      },
      {
        title: "Tạo bài giảng mới",
        detail: "Địa lý - Chương 3",
        tag: "BÌNH THƯỜNG",
        color: "blue",
        date: "T7",
      },
      {
        title: "Giao bài tập tuần 10",
        detail: "Tiếng Anh 7C",
        tag: "ĐÃ HOÀN THÀNH",
        color: "green",
        date: "Hôm qua",
      },
    ];
  
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-2xl font-extrabold text-gray-800 mb-6 flex items-center gap-2">📋 Công việc sắp tới</h2>
        <div className="space-y-4">
          {tasks.map((t, i) => (
            <div
              key={i}
              className={`border-l-4 border-${t.color}-500 bg-${t.color}-50 rounded-r-xl p-4`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-xs font-semibold text-${t.color}-600 bg-${t.color}-100 px-2 py-1 rounded-full`}
                >
                  {t.tag}
                </span>
                <span className="text-xs text-gray-500">{t.date}</span>
              </div>
              <h4 className="font-bold text-gray-800 mb-1">{t.title}</h4>
              <p className="text-sm text-gray-600">{t.detail}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }
  