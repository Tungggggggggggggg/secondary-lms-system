"use client";

export default function StatsGrid() {
  const stats = [
    { icon: "📚", number: 6, label: "Khóa học đang giảng dạy" },
    { icon: "👥", number: 142, label: "Học sinh hiện tại" },
    { icon: "📝", number: 28, label: "Bài tập đã giao" },
    { icon: "⏰", number: 12, label: "Bài đang chờ chấm" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((s, i) => (
        <div
          key={i}
          className="bg-white p-4 rounded-xl shadow-sm text-center hover:shadow-md transition"
        >
          <div className="text-3xl">{s.icon}</div>
          <h2 className="text-2xl font-bold text-indigo-600">{s.number}</h2>
          <p className="text-gray-600 text-sm">{s.label}</p>
        </div>
      ))}
    </div>
  );
}
