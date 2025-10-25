"use client";

import { useEffect } from "react";
import gsap from "gsap";

export default function PerformanceChart() {
  const subjects = [
    { icon: "📜", name: "Lịch sử", percent: 92, color: "from-yellow-400 to-yellow-500" },
    { icon: "🗺️", name: "Địa lý", percent: 88, color: "from-emerald-400 to-emerald-500" },
    { icon: "🗣️", name: "Tiếng Anh", percent: 85, color: "from-blue-400 to-blue-500" },
  ];

  useEffect(() => {
    gsap.fromTo(
      ".chart-bar",
      { width: 0 },
      { width: (i, el) => el.getAttribute("data-width") + "%", duration: 1.2, delay: 0.2, stagger: 0.3 }
    );
  }, []);

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h2 className="text-2xl font-extrabold text-gray-800 mb-6 flex items-center gap-2">
        📈 Hiệu suất giảng dạy
      </h2>
      <div className="space-y-6">
        {subjects.map((s, idx) => (
          <div key={idx}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">{s.icon} {s.name}</span>
              <span className="text-sm font-bold text-gray-800">{s.percent}%</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`chart-bar h-full bg-gradient-to-r ${s.color} rounded-full`}
                data-width={s.percent}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">Điểm trung bình lớp</p>
          </div>
        ))}
      </div>
    </div>
  );
}
