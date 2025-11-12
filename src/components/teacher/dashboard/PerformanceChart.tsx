"use client";

import { useEffect } from "react";
import { useTeacherDashboard } from "@/hooks/use-teacher-dashboard";
import gsap from "gsap";

export default function PerformanceChart() {
  const { performance, isLoading, error, fetchPerformance } = useTeacherDashboard();

  useEffect(() => {
    fetchPerformance();
  }, [fetchPerformance]);

  useEffect(() => {
    if (performance && performance.length > 0) {
      // Animate bars khi có dữ liệu
      gsap.fromTo(
        ".chart-bar",
        { width: 0 },
        { width: (i, el) => el.getAttribute("data-width") + "%", duration: 1.2, delay: 0.2, stagger: 0.3 }
      );
    }
  }, [performance]);

  // Loading state
  if (isLoading && !performance) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-2xl font-extrabold text-gray-800 mb-6 flex items-center gap-2">
          📈 Hiệu suất giảng dạy
        </h2>
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center justify-between mb-2">
                <div className="h-4 w-32 bg-gray-200 rounded"></div>
                <div className="h-4 w-12 bg-gray-200 rounded"></div>
              </div>
              <div className="h-3 bg-gray-100 rounded-full"></div>
              <div className="h-3 w-24 bg-gray-200 rounded mt-1"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-2xl font-extrabold text-gray-800 mb-6 flex items-center gap-2">
          📈 Hiệu suất giảng dạy
        </h2>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-600 text-sm">Lỗi khi tải hiệu suất: {error}</p>
        </div>
      </div>
    );
  }

  // No data state
  if (!performance || performance.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-2xl font-extrabold text-gray-800 mb-6 flex items-center gap-2">
          📈 Hiệu suất giảng dạy
        </h2>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
          <p className="text-gray-600">Chưa có dữ liệu hiệu suất</p>
          <p className="text-sm text-gray-500 mt-2">Tạo bài tập và chấm điểm để xem hiệu suất giảng dạy</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h2 className="text-2xl font-extrabold text-gray-800 mb-6 flex items-center gap-2">
        📈 Hiệu suất giảng dạy
      </h2>
      <div className="space-y-6">
        {performance.slice(0, 5).map((item, idx) => (
          <div key={item.classroomId}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">
                {item.icon} {item.classroomName}
              </span>
              <span className="text-sm font-bold text-gray-800">{item.averageGrade}%</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`chart-bar h-full bg-gradient-to-r ${item.color} rounded-full`}
                data-width={item.averageGrade}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Điểm trung bình lớp • {item.submittedCount}/{item.totalStudents} học sinh đã nộp
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}