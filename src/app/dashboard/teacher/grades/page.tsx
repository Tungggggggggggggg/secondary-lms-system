"use client";

import GradesList from "@/components/teacher/grades/GradesList";
import GradesStats from "@/components/teacher/grades/GradesStats";

export default function GradesPage() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-800 mb-2">Quản lý điểm số</h1>
          <p className="text-gray-600">Theo dõi và đánh giá kết quả học tập</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-6 py-3 bg-white text-gray-700 font-semibold rounded-xl hover:shadow-lg transition-all flex items-center gap-2 border border-gray-200">
            <span>📋</span>
            <span>Nhập điểm</span>
          </button>
          <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all flex items-center gap-2">
            <span>📊</span>
            <span>Xuất báo cáo</span>
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <GradesStats />

      {/* Filter & Search */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <select className="px-4 py-2 bg-white rounded-xl border border-gray-200">
            <option value="all">Tất cả môn học</option>
            <option value="history">Lịch sử</option>
            <option value="geography">Địa lý</option>
            <option value="english">Tiếng Anh</option>
          </select>
          <select className="px-4 py-2 bg-white rounded-xl border border-gray-200">
            <option value="all">Tất cả lớp</option>
            <option value="8a1">Lớp 8A1</option>
            <option value="9b2">Lớp 9B2</option>
            <option value="7c">Lớp 7C</option>
          </select>
          <select className="px-4 py-2 bg-white rounded-xl border border-gray-200">
            <option value="latest">Mới nhất</option>
            <option value="highest">Điểm cao nhất</option>
            <option value="lowest">Điểm thấp nhất</option>
          </select>
        </div>
        <div className="relative">
          <input 
            type="text"
            placeholder="Tìm kiếm lớp học..."
            className="pl-10 pr-4 py-2 bg-white rounded-xl border border-gray-200 w-64"
          />
          <span className="absolute left-3 top-2.5">🔍</span>
        </div>
      </div>

      {/* Grades List */}
      <GradesList />
    </div>
  );
}
