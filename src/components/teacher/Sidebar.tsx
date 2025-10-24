"use client";

export default function Sidebar() {
  return (
    <aside className="w-64 bg-indigo-700 text-white flex flex-col p-6">
      <div className="mb-10">
        <h1 className="text-2xl font-bold">SmartLearn Junior</h1>
        <p className="text-sm text-indigo-200">Hệ thống Học Trực Tuyến THCS</p>
      </div>
      <nav className="space-y-3">
        {[
          "📚 Khóa học của tôi",
          "🧑‍🏫 Lớp học & Học sinh",
          "📝 Bài tập & Bài kiểm tra",
          "📊 Tiến độ học tập",
          "🔔 Thông báo",
          "⚙️ Cài đặt tài khoản",
        ].map((item, i) => (
          <a
            key={i}
            href="#"
            className={`block py-2 px-3 rounded-md hover:bg-indigo-600 ${
              i === 0 ? "bg-indigo-600 font-semibold" : ""
            }`}
          >
            {item}
          </a>
        ))}
      </nav>
    </aside>
  );
}
