export default function WeeklyGoals() {
    const goals = [
      { title: "Chấm bài tập", done: 28, total: 35 },
      { title: "Tạo bài giảng mới", done: 3, total: 5 },
      { title: "Phản hồi phụ huynh", done: 12, total: 15 },
    ];
  
    return (
      <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-6 text-white">
        <h2 className="text-xl font-extrabold mb-4 flex items-center gap-2">🎯 Mục tiêu tuần này</h2>
        <div className="space-y-4">
          {goals.map((g, i) => {
            const percent = Math.round((g.done / g.total) * 100);
            return (
              <div key={i}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">{g.title}</span>
                  <span className="text-sm font-bold">
                    {g.done}/{g.total}
                  </span>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full" style={{ width: `${percent}%` }}></div>
                </div>
              </div>
            );
          })}
          <div className="bg-white/10 rounded-xl p-3 mt-4 flex items-center gap-2">
            <span className="text-2xl">🔥</span>
            <div>
              <div className="font-bold">Streak 15 ngày!</div>
              <div className="text-xs text-white/80">Tiếp tục phát huy nhé!</div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  