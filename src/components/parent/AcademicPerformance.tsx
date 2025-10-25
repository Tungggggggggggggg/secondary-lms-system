// src/components/parent/AcademicPerformance.tsx
export default function AcademicPerformance() {
    const subjects = [
      { name: "Lịch sử", score: 85, color: "bg-yellow-500", note: "Điểm trung bình: 8.5/10" },
      { name: "Địa lý", score: 90, color: "bg-teal-500", note: "Điểm trung bình: 9.0/10" },
      { name: "Tiếng Anh", score: 85, color: "bg-blue-500", note: "Điểm trung bình: 8.5/10" },
    ];
  
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-extrabold text-gray-800 flex items-center gap-2">
            📊 Kết quả học tập
          </h2>
          <a href="#" className="text-sm font-semibold text-purple-600 hover:text-purple-700">
            Xem chi tiết →
          </a>
        </div>
  
        <div className="space-y-6">
          {subjects.map((s) => (
            <div key={s.name}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-bold text-gray-900">{s.name}</h3>
                  <p className="text-sm text-gray-600">{s.note}</p>
                </div>
                <span className="text-2xl font-bold text-gray-700">{s.score}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className={`${s.color} h-3 rounded-full`} style={{ width: `${s.score}%` }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  