// src/components/student/QuickActions.tsx
"use client";

export default function QuickActions() {
  const actions = [
    { icon: "📚", title: "Bài học mới", desc: "Tiếp tục học tập" },
    { icon: "✍️", title: "Làm bài tập", desc: "Hoàn thành assignment" },
    { icon: "📊", title: "Xem điểm", desc: "Kiểm tra kết quả" },
    { icon: "🎯", title: "Mục tiêu", desc: "Theo dõi tiến độ" },
  ];

  return (
    <div className="grid md:grid-cols-4 gap-6">
      {actions.map((a) => (
        <button
          key={a.title}
          className="gradient-border rounded-2xl p-6 text-center hover-lift group"
        >
          <div className="text-5xl mb-3 animate-float-3d">{a.icon}</div>
          <h3 className="font-bold text-gray-800 mb-2">{a.title}</h3>
          <p className="text-sm text-gray-600">{a.desc}</p>
        </button>
      ))}
    </div>
  );
}