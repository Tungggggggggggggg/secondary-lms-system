"use client";

import Breadcrumb, { BreadcrumbItem } from "@/components/ui/breadcrumb";
import ClassroomList from "@/components/teacher/classrooms/ClassroomList";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/shared/PageHeader";

// Trang lớp học của giáo viên
export default function ClassroomsPage() {
  // Không gọi fetchClassrooms ở đây nữa, ClassroomList sẽ tự lấy dữ liệu qua hook

  // Breadcrumb items cho trang danh sách lớp học
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "Dashboard", href: "/dashboard/teacher/dashboard" },
    { label: "Lớp học", href: "/dashboard/teacher/classrooms" },
  ];

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <Breadcrumb items={breadcrumbItems} color="blue" className="mb-2" />
      <PageHeader
        title="Lớp học của tôi"
        subtitle="Quản lý và theo dõi các lớp học của bạn"
        role="teacher"
      />

      <div className="flex justify-end">
        <Button
          type="button"
          color="blue"
          onClick={() => {
            window.location.href = "/dashboard/teacher/classrooms/new";
          }}
        >
          Tạo lớp học mới
        </Button>
      </div>

      {/* Classroom List */}
      <ClassroomList />
    </div>
  );
}