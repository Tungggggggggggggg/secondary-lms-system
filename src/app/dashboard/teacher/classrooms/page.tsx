"use client";

import Breadcrumb, { BreadcrumbItem } from "@/components/ui/breadcrumb";
import ClassroomList from "@/components/teacher/classrooms/ClassroomList";


// Trang lớp học của giáo viên
export default function ClassroomsPage() {
  // Không gọi fetchClassrooms ở đây nữa, ClassroomList sẽ tự lấy dữ liệu qua hook

  // Breadcrumb items cho trang danh sách lớp học
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "Dashboard", href: "/dashboard/teacher/dashboard" },
    { label: "Lớp học", href: "/dashboard/teacher/classrooms" },
  ];

  return (
    <div className="p-8">
      <Breadcrumb items={breadcrumbItems} className="mb-4" />
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-800 mb-2">Lớp học của tôi</h1>
          <p className="text-gray-600">Quản lý và theo dõi các lớp học của bạn</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {/* Handle import students */}}
            className="px-6 py-3 bg-white text-gray-700 font-semibold rounded-xl hover:shadow-lg transition-all flex items-center gap-2 border border-gray-200"
          >
            <span>📥</span>
            <span>Nhập danh sách</span>
          </button>
          <button 
            onClick={() => window.location.href = "/dashboard/teacher/classrooms/new"}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all flex items-center gap-2"
          >
            <span>➕</span>
            <span>Tạo lớp học mới</span>
          </button>
        </div>
      </div>

      {/* Classroom List */}
      <ClassroomList />
    </div>
  );
}