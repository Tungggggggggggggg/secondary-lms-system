// src/components/parent/MonthlyReport.tsx
export default function MonthlyReport() {
    const reports = [
      {
        icon: "📚",
        label: "Bài học đã học",
        value: "42/50 bài",
        color: "from-blue-400 to-blue-500",
      },
      {
        icon: "✍️",
        label: "Bài tập hoàn thành",
        value: "15/16 bài",
        color: "from-green-400 to-green-500",
      },
      {
        icon: "⭐",
        label: "Điểm trung bình",
        value: "8.7/10",
        color: "from-yellow-400 to-yellow-500",
      },
      {
        icon: "🎯",
        label: "Đạt mục tiêu",
        value: "100%",
        color: "from-purple-400 to-purple-500",
      },
    ];
  
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-extrabold text-gray-800 flex items-center gap-2">
            📊 Báo cáo tháng 10
          </h2>
          <button className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all">
            Tải báo cáo PDF
          </button>
        </div>
  
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {reports.map((r) => (
            <div
              key={r.label}
              className={`bg-gradient-to-br ${r.color} rounded-xl p-6 text-white text-center`}
            >
              <div className="text-4xl mb-2">{r.icon}</div>
              <h3 className="font-bold text-sm mb-1">{r.label}</h3>
              <p className="text-xs opacity-90">{r.value}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }
  