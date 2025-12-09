"use client";

import Breadcrumb, { BreadcrumbItem } from "@/components/ui/breadcrumb";
import ClassroomList from "@/components/teacher/classrooms/ClassroomList";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useRouter } from "next/navigation";

// Trang Lớp học cá»§a giÃ¡o viÃªn
export default function ClassroomsPage() {
  // KhÃ´ng gá»i fetchClassrooms á»Ÿ Ä‘Ã¢y ná»¯a, ClassroomList sáº½ tá»± láº¥y dá»¯ liá»‡u qua hook

  // Breadcrumb items cho trang danh sÃ¡ch Lớp họcc
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "Dashboard", href: "/dashboard/teacher/dashboard" },
    { label: "Lớp học", href: "/dashboard/teacher/classrooms" },
  ];
  const router = useRouter();

  return (
    <ProtectedRoute allowedRoles={["TEACHER"]}>
      <div className="p-8 space-y-6">
        {/* Header */}
        <Breadcrumb items={breadcrumbItems} color="blue" className="mb-2" />
        <PageHeader
          title="Lớp học của tôi"
          subtitle="Quản lí và theo dõi các lớp học của bạn"
          role="teacher"
        />

        <div className="flex justify-end">
          <Button
            type="button"
            color="blue"
            variant="primary"
            onClick={() => router.push("/dashboard/teacher/classrooms/new")}
          >
            Tạo lớp học mới
          </Button>
        </div>

        {/* Classroom List */}
        <ClassroomList />
      </div>
    </ProtectedRoute>
  );
}
