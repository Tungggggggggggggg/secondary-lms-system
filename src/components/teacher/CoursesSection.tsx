"use client";
import ProgressChart from "./ProgressChart";

export default function CoursesSection() {
  const courses = [
    { title: "Lịch sử Việt Nam", classes: "Lớp 8A, 8B", progress: "85%" },
    { title: "Địa lý Việt Nam", classes: "Lớp 9A, 9C", progress: "72%" },
    { title: "Tiếng Anh 8", classes: "Lớp 8C, 8D", progress: "91%" },
  ];

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Khóa học của tôi</h2>
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {courses.map((c, i) => (
          <div
            key={i}
            className="bg-indigo-50 hover:bg-indigo-100 transition p-4 rounded-xl"
          >
            <h3 className="text-lg font-semibold text-indigo-700">{c.title}</h3>
            <p className="text-sm text-gray-600">{c.classes}</p>
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm font-medium text-gray-700">
                {c.progress} hoàn thành
              </span>
              <button className="text-sm text-indigo-600 hover:underline">
                Xem chi tiết
              </button>
            </div>
          </div>
        ))}
      </div>
      <ProgressChart />
    </div>
  );
}
