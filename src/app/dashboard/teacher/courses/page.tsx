"use client";

import CourseList from "@/components/teacher/courses/CourseList";
import CourseStats from "@/components/teacher/courses/CourseStats";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export default function CoursesPage() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-800 mb-2">Khóa học của tôi</h1>
          <p className="text-gray-600">Quản lý và theo dõi tất cả khóa học của bạn</p>
        </div>
        <Button
          onClick={() => {
            window.location.href = "/dashboard/teacher/courses/new";
          }}
          size="lg"
          className="flex items-center gap-2"
        >
          <span>➕</span>
          <span>Tạo khóa học mới</span>
        </Button>
      </div>

      {/* Stats Overview */}
      <CourseStats />

      {/* Filter & Search (có thể thêm sau) */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Select>
            <option value="all">Tất cả khóa học</option>
            <option value="active">Đang diễn ra</option>
            <option value="completed">Đã hoàn thành</option>
            <option value="draft">Bản nháp</option>
          </Select>
          <Select>
            <option value="recent">Gần đây nhất</option>
            <option value="oldest">Cũ nhất</option>
            <option value="name">Theo tên</option>
            <option value="students">Số học sinh</option>
          </Select>
        </div>
        <div className="relative">
          <Input
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
