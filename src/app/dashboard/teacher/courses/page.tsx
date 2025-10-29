"use client";

import CourseList from "@/components/teacher/courses/CourseList";
import CourseStats from "@/components/teacher/courses/CourseStats";

export default function CoursesPage() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-800 mb-2">Khóa học của tôi</h1>
          <p className="text-gray-600">Quản lý và theo dõi tất cả khóa học của bạn</p>
        </div>
        <button 
          onClick={() => window.location.href = "/dashboard/teacher/courses/new"}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all flex items-center gap-2"
        >
          <span>➕</span>
          <span>Tạo khóa học mới</span>
        </button>
      </div>

      {/* Stats Overview */}
      <CourseStats />

      {/* Filter & Search (có thể thêm sau) */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <select className="px-4 py-2 bg-white rounded-xl border border-gray-200">
            <option value="all">Tất cả khóa học</option>
            <option value="active">Đang diễn ra</option>
            <option value="completed">Đã hoàn thành</option>
            <option value="draft">Bản nháp</option>
          </select>
          <select className="px-4 py-2 bg-white rounded-xl border border-gray-200">
            <option value="recent">Gần đây nhất</option>
            <option value="oldest">Cũ nhất</option>
            <option value="name">Theo tên</option>
            <option value="students">Số học sinh</option>
          </select>
        </div>
        <div className="relative">
          <input 
            type="text"
            placeholder="Tìm kiếm khóa học..."
            className="pl-10 pr-4 py-2 bg-white rounded-xl border border-gray-200 w-64"
          />
          <span className="absolute left-3 top-2.5">🔍</span>
        </div>
      </div>

      {/* Course List */}
      <CourseList />
    </div>
  );
}
