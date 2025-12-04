"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { teacherClassroomGradesPath } from "@/utils/routing";
import { useClassroom } from "@/hooks/use-classroom";

interface GradesListProps {
  search?: string;
}

export default function GradesList({ search = "" }: GradesListProps) {
  const router = useRouter();
  const { classrooms, isLoading, error, fetchClassrooms } = useClassroom();

  useEffect(() => {
    fetchClassrooms();
  }, [fetchClassrooms]);

  const items = useMemo(
    () =>
      (classrooms ?? []).map((c) => ({
        classroomId: c.id,
        name: c.name,
        code: c.code,
        icon: c.icon,
        studentCount: c._count?.students ?? 0,
        createdAt: c.createdAt,
      })),
    [classrooms]
  );

  const normalizedSearch = search.trim().toLowerCase();

  const visibleItems = useMemo(
    () =>
      !normalizedSearch
        ? items
        : items.filter(
            (cls) =>
              cls.name.toLowerCase().includes(normalizedSearch) ||
              cls.code.toLowerCase().includes(normalizedSearch),
          ),
    [items, normalizedSearch]
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-6 shadow-md animate-pulse"
          >
            <div className="h-5 w-1/3 bg-gray-200 rounded mb-3" />
            <div className="h-4 w-1/2 bg-gray-100 rounded mb-2" />
            <div className="h-3 w-2/3 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 bg-red-50 border border-red-200 rounded-xl p-4 text-sm">
        Đã xảy ra lỗi khi tải danh sách lớp: {error}
      </div>
    );
  }

  if (!visibleItems.length) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-gray-200 text-center text-gray-600">
        Chưa có lớp học nào để hiển thị điểm số.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {visibleItems.map((cls) => (
        <div
          key={cls.classroomId}
          className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer"
          onClick={() => router.push(teacherClassroomGradesPath(cls.classroomId))}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-1">
                {cls.icon} {cls.name}
              </h3>
              <div className="text-sm text-gray-600">
                Mã lớp: <span className="font-semibold">{cls.code}</span> • {cls.studentCount} học sinh
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                router.push(teacherClassroomGradesPath(cls.classroomId));
              }}
              className="px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-xl transition-all text-sm font-semibold border border-purple-100"
            >
              Xem bảng điểm
            </button>
          </div>

          <div className="mt-2 text-sm text-gray-500">
            {/* Có thể bổ sung thống kê điểm thật ở đây nếu cần thêm API tổng hợp */}
            Nhấn để xem chi tiết điểm số của lớp.
          </div>
        </div>
      ))}
    </div>
  );
}