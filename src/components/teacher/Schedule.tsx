"use client";

export default function Schedule() {
  const schedule = [
    { time: "7:30", subject: "Lịch sử Việt Nam", detail: "Lớp 8A - Phòng 201" },
    { time: "9:15", subject: "Địa lý Việt Nam", detail: "Lớp 9C - Phòng 105" },
    { time: "14:00", subject: "Tiếng Anh 8", detail: "Lớp 8D - Phòng 302" },
  ];

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Lịch dạy hôm nay</h3>
      <div className="space-y-3">
        {schedule.map((s, i) => (
          <div
            key={i}
            className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition"
          >
            <div className="w-16 text-center font-semibold text-indigo-600">
              {s.time}
            </div>
            <div>
              <h4 className="font-medium text-gray-800">{s.subject}</h4>
              <p className="text-sm text-gray-600">{s.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
