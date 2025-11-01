"use client";


import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useClassroom } from "@/hooks/use-classroom";
import { ClassroomResponse } from "@/types/classroom";


export default function ClassroomList() {
  const router = useRouter();
  const { classrooms, isLoading, error, fetchClassrooms } = useClassroom();
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "archived">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name" | "students">("newest");
  const [searchQuery, setSearchQuery] = useState("");

  // Khi component mount, tự động lấy danh sách lớp học
  // Lấy danh sách lớp học chỉ 1 lần khi component mount
  useEffect(() => {
    fetchClassrooms();
  }, [fetchClassrooms]); // fetchClassrooms đã được bọc useCallback nên dependency này an toàn, không gây vòng lặp

  // Logging lỗi nếu có
  useEffect(() => {
    if (error) {
      console.error('[ClassroomList] Lỗi:', error);
    }
  }, [error]);

  // Filter và sort classrooms
  const filteredAndSortedClassrooms = useMemo(() => {
    if (!classrooms) return [];

    let filtered = [...classrooms];

    // Filter theo status
    if (statusFilter === "active") {
      filtered = filtered.filter((c) => c.isActive);
    } else if (statusFilter === "archived") {
      filtered = filtered.filter((c) => !c.isActive);
    }

    // Filter theo search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.code.toLowerCase().includes(query) ||
          c.description?.toLowerCase().includes(query)
      );
    }

    // Sort
    switch (sortBy) {
      case "name":
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "students":
        filtered.sort(
          (a, b) => (b._count?.students ?? 0) - (a._count?.students ?? 0)
        );
        break;
      case "oldest":
        filtered.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        break;
      case "newest":
      default:
        filtered.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
    }

    return filtered;
  }, [classrooms, statusFilter, sortBy, searchQuery]);

  if (isLoading) {
    return (
      <div className="grid md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white rounded-2xl shadow-lg p-6 animate-pulse"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-gray-200 rounded-xl"></div>
              <div className="flex-1">
                <div className="h-4 w-2/3 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 w-1/2 bg-gray-200 rounded"></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full bg-gray-200 rounded"></div>
              <div className="h-3 w-4/5 bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 font-semibold p-4 bg-red-50 rounded-xl mb-4">
        Đã xảy ra lỗi khi tải danh sách lớp học: {error}
      </div>
    );
  }

  return (
    <>
      {/* Filter & Search */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                e.target.value as "all" | "active" | "archived"
              )
            }
            className="px-4 py-2 bg-white rounded-xl border border-gray-200"
          >
            <option value="all">Tất cả lớp học</option>
            <option value="active">Đang hoạt động</option>
            <option value="archived">Đã lưu trữ</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(
                e.target.value as "newest" | "oldest" | "name" | "students"
              )
            }
            className="px-4 py-2 bg-white rounded-xl border border-gray-200"
          >
            <option value="newest">Mới nhất</option>
            <option value="oldest">Cũ nhất</option>
            <option value="name">Theo tên</option>
            <option value="students">Số học sinh</option>
          </select>
        </div>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm lớp học..."
            className="pl-10 pr-4 py-2 bg-white rounded-xl border border-gray-200 w-64"
          />
          <span className="absolute left-3 top-2.5">🔍</span>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Create new classroom card */}
        <div
          onClick={() => router.push("/dashboard/teacher/classrooms/new")}
          className="bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl p-6 text-white hover:shadow-xl transition-all cursor-pointer hover:-translate-y-1"
        >
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-5xl mb-3">➕</div>
              <h3 className="text-xl font-bold mb-2">Tạo lớp học mới</h3>
              <p className="text-white/80">Tạo không gian học tập mới</p>
            </div>
          </div>
        </div>

        {filteredAndSortedClassrooms.length > 0 ? (
          filteredAndSortedClassrooms.map((classroom: ClassroomResponse) => (
          <div
            key={classroom.id}
            onClick={() => router.push(`/dashboard/teacher/classrooms/${classroom.id}`)}
            className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all cursor-pointer hover:-translate-y-1"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-xl flex items-center justify-center text-2xl">
                {classroom.icon}
              </div>
              <div className="bg-green-100 text-green-600 px-3 py-1 rounded-full text-sm font-medium">
                {classroom.isActive ? 'Đang hoạt động' : 'Đã lưu trữ'}
              </div>
            </div>

            <h3 className="text-xl font-bold text-gray-800 mb-2">{classroom.name}</h3>
            <div className="text-sm text-gray-600 mb-4">
              {classroom.description || "Không có mô tả"}
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Mã lớp: {classroom.code}</span>
              <span>{classroom._count?.students ?? 0} học sinh</span>
            </div>
          </div>
          ))
        ) : (
          <div className="col-span-3 text-center text-gray-500 py-8">
            {classrooms && classrooms.length > 0
              ? "Không tìm thấy lớp học nào phù hợp với bộ lọc."
              : "Không có lớp học nào."}
          </div>
        )}
      </div>
    </>
  );
}