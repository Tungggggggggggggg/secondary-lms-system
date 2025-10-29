"use client";

import AssignmentList from "@/components/teacher/assignments/AssignmentList";
import AssignmentStats from "@/components/teacher/assignments/AssignmentStats";

export default function AssignmentsPage() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-800 mb-2">Quản lý bài tập</h1>
          <p className="text-gray-600">Tạo và quản lý bài tập cho học sinh của bạn</p>
        </div>
        <button 
          onClick={() => window.location.href = "/dashboard/teacher/assignments/new"}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all flex items-center gap-2"
        >
          <span>➕</span>
          <span>Tạo bài tập mới</span>
        </button>
      </div>

      {/* Stats Overview */}
      <AssignmentStats />

      {/* Filter & Search */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <select className="px-4 py-2 bg-white rounded-xl border border-gray-200">
            <option value="all">Tất cả bài tập</option>
            <option value="active">Đang diễn ra</option>
            <option value="completed">Đã kết thúc</option>
            <option value="draft">Bản nháp</option>
          </select>
          <select className="px-4 py-2 bg-white rounded-xl border border-gray-200">
            <option value="all">Tất cả lớp</option>
            <option value="8a1">Lớp 8A1</option>
            <option value="9b2">Lớp 9B2</option>
            <option value="7c">Lớp 7C</option>
          </select>
        </div>
        <div className="relative">
          <input 
            type="text"
            placeholder="Tìm kiếm bài tập..."
            className="pl-10 pr-4 py-2 bg-white rounded-xl border border-gray-200 w-64"
          />
          <span className="absolute left-3 top-2.5">🔍</span>
        </div>
      </div>

      {/* Assignment List */}
      <AssignmentList />
    </div>
  );
}
