"use client";


// ...existing code...
import ClassroomList from "@/components/teacher/classrooms/ClassroomList";


// Trang lớp học của giáo viên
export default function ClassroomsPage() {
  // Không gọi fetchClassrooms ở đây nữa, ClassroomList sẽ tự lấy dữ liệu qua hook

  return (
    <div className="p-8">
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

      {/* Filter & Search */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <select className="px-4 py-2 bg-white rounded-xl border border-gray-200">
            <option value="all">Tất cả lớp học</option>
            <option value="active">Đang hoạt động</option>
            <option value="archived">Đã lưu trữ</option>
          </select>
          <select className="px-4 py-2 bg-white rounded-xl border border-gray-200">
            <option value="newest">Mới nhất</option>
            <option value="oldest">Cũ nhất</option>
            <option value="name">Theo tên</option>
            <option value="students">Số học sinh</option>
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

  {/* Classroom List */}
  <ClassroomList />
    </div>
  );
}