// src/components/parent/AttendanceSummary.tsx
export default function AttendanceSummary() {
    return (
      <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-6 text-white">
        <h2 className="text-xl font-extrabold mb-4 flex items-center gap-2">
          📋 Chuyên cần
        </h2>
        <div className="text-right mb-4">
          <span className="text-sm font-semibold bg-white/20 px-3 py-1 rounded-full">95%</span>
        </div>
  
        <div className="space-y-4">
          {[
            { label: "Đi học đầy đủ", value: "19/20 ngày", percent: 95 },
            { label: "Tham gia lớp học", value: "18/20", percent: 90 },
            { label: "Nộp bài đúng hạn", value: "15/16", percent: 94 },
          ].map((item) => (
            <div key={item.label}>
              <div className="flex items-center justify-between mb-2 text-sm">
                <span>{item.label}</span>
                <span className="font-semibold">{item.value}</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div
                  className="bg-white h-2 rounded-full"
                  style={{ width: `${item.percent}%` }}
                ></div>
              </div>
            </div>
          ))}
  
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 mt-4 flex items-center gap-3">
            <div className="text-2xl">🌟</div>
            <div>
              <p className="font-semibold text-sm">Tuyệt vời!</p>
              <p className="text-xs opacity-90">Con bạn đang rất tích cực</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  