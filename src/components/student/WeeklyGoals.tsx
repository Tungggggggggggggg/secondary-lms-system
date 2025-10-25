// src/components/student/WeeklyGoals.tsx
export default function WeeklyGoals() {
    const goals = [
      { label: "Hoàn thành bài học", done: 12, total: 12 },
      { label: "Nộp bài tập", done: 5, total: 8 },
      { label: "Đạt điểm cao", done: 3, total: 3 },
    ];
  
    return (
      <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-6 text-white">
        <h2 className="text-xl font-extrabold mb-4 flex items-center gap-2">
          🎯 Mục tiêu tuần này
        </h2>
        <div className="space-y-4">
          {goals.map((g) => (
            <div key={g.label}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">{g.label}</span>
                <span className="text-sm font-bold">
                  {g.done}/{g.total}
                </span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full"
                  style={{ width: `${(g.done / g.total) * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
  
          <div className="bg-white/10 rounded-xl p-3 mt-4 flex items-center gap-2">
            <span className="text-2xl">🔥</span>
            <div>
              <div className="font-bold">Streak 7 ngày!</div>
              <div className="text-xs text-white/80">Bạn đã học 7 ngày liên tiếp</div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  