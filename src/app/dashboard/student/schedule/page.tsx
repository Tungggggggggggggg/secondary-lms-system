// src/app/student/schedule/page.tsx
export default function SchedulePage() {
    // Dữ liệu mẫu cho tuần
    const weekDays = [
      { key: "mon", label: "Thứ 2", date: "27/10/2025" },
      { key: "tue", label: "Thứ 3", date: "28/10/2025" },
      { key: "wed", label: "Thứ 4", date: "29/10/2025" },
      { key: "thu", label: "Thứ 5", date: "30/10/2025" },
      { key: "fri", label: "Thứ 6", date: "31/10/2025" },
      { key: "sat", label: "Thứ 7", date: "01/11/2025" },
      { key: "sun", label: "Chủ nhật", date: "02/11/2025" },
    ];

    const slots = [
      { key: "morning1", label: "Ca 2" },
      { key: "morning2", label: "Ca 3" },
      { key: "afternoon1", label: "Ca 4" },
    ];

    // Sự kiện mẫu theo ngày/ca
    const events: Record<string, { title: string; code: string; time: string; room: string; campus: string; color: string; }[]> = {
      tue_morning2: [
        { title: "Lịch sử", code: "010100121001", time: "12:10 - 14:40", room: "H108", campus: "CS3", color: "bg-sky-50 border-sky-200" },
      ],
      fri_afternoon1: [
        { title: "Tiếng anh", code: "010115400801", time: "14:50 - 17:20", room: "H102", campus: "CS3", color: "bg-indigo-50 border-indigo-200" },
      ],
    };

    return (
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input type="date" defaultValue="2025-10-28" className="h-10 rounded-md border px-3" />
            <button className="h-10 px-3 rounded-md border">⏮</button>
            <button className="h-10 px-3 rounded-md border">HÔM NAY</button>
            <button className="h-10 px-3 rounded-md border">⏭</button>
          </div>
        </div>

        <div className="rounded-xl border overflow-hidden bg-white">
          {/* Header hàng ngày */}
          <div className="grid" style={{ gridTemplateColumns: "160px repeat(7, minmax(0, 1fr))" }}>
            <div className="bg-teal-700 text-white font-semibold flex items-center px-4 py-3">Ca học</div>
            {weekDays.map((d, idx) => (
              <div key={d.key} className={`text-white px-4 py-3 bg-teal-700 ${idx === 1 ? "relative" : ""}`}>
                <div className="font-semibold">{d.label}</div>
                <div className="text-sm opacity-90">{d.date}</div>
              </div>
            ))}
          </div>

          {/* Lưới thân lịch */}
          {slots.map((slot, rIdx) => (
            <div key={slot.key} className="grid" style={{ gridTemplateColumns: "160px repeat(7, minmax(0, 1fr))" }}>
              {/* Cột tên ca */}
              <div className="bg-teal-700/95 text-white px-4 py-10 border-t border-white/20 flex items-center">{slot.label}</div>
              {/* 7 cột ngày */}
              {weekDays.map((d) => {
                const key = `${d.key}_${slot.key}` as keyof typeof events;
                const dayEvents = (events as any)[key] as typeof events[string] | undefined;
                return (
                  <div key={d.key} className="relative h-40 border-t">
                    {/* Hiển thị ô sự kiện */}
                    {dayEvents?.map((ev, i) => (
                      <div key={i} className={`absolute left-3 right-3 top-3 rounded-xl border p-3 shadow-sm ${ev.color}`}>
                        <div className="font-semibold">{ev.title}</div>
                        <div className="text-xs text-gray-600">{ev.code}</div>
                        <div className="mt-2 space-y-1 text-sm">
                          <div>📘 Tiết: 7 - 9</div>
                          <div>🕒 {ev.time}</div>
                          <div>🏫 Phòng: {ev.room} - {ev.campus}</div>
                          <div className="text-rose-600 font-medium">🔴 LMS</div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
}