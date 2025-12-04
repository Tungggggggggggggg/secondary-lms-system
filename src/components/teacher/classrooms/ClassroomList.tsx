"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useClassroom } from "@/hooks/use-classroom";
import { ClassroomResponse } from "@/types/classroom";
import ClassroomListSkeleton from "@/components/teacher/classrooms/ClassroomListSkeleton";
import EmptyState from "@/components/shared/EmptyState";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

type ViewMode = "grid" | "list";

export default function ClassroomList() {
  const router = useRouter();
  const { classrooms, isLoading, error, fetchClassrooms } = useClassroom();

  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "archived">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name" | "students">("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState<ViewMode>("grid");

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
    return <ClassroomListSkeleton />;
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTitle>Đã xảy ra lỗi khi tải danh sách lớp học</AlertTitle>
        <AlertDescription>{String(error)}</AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      {/* Filter & Search */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center mb-8">
        <div className="relative md:justify-self-start w-full">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm">
            🔍
          </span>
          <Input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Tìm kiếm lớp học..."
            className="pl-9 pr-3 h-12 bg-white border-gray-200 w-full md:w-80"
            color="blue"
          />
        </div>

        <div className="flex flex-wrap items-center justify-start md:justify-end gap-2">
          <Select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as "all" | "active" | "archived")
            }
            className="min-w-[150px] h-12"
            color="blue"
          >
            <option value="all">Tất cả lớp học</option>
            <option value="active">Đang hoạt động</option>
            <option value="archived">Đã lưu trữ</option>
          </Select>

          <Select
            value={sortBy}
            onChange={(event) =>
              setSortBy(
                event.target.value as "newest" | "oldest" | "name" | "students"
              )
            }
            className="min-w-[140px] h-12"
            color="blue"
          >
            <option value="newest">Mới nhất</option>
            <option value="oldest">Cũ nhất</option>
            <option value="name">Theo tên</option>
            <option value="students">Số học sinh</option>
          </Select>

          <div className="flex h-12 items-center gap-2 border border-gray-200 rounded-xl p-1 bg-white">
            <button
              type="button"
              onClick={() => setView("grid")}
              className={`px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                view === "grid"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
              aria-label="Xem dạng lưới"
              aria-pressed={view === "grid"}
            >
              🔲
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={`px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                view === "list"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
              aria-label="Xem dạng danh sách"
              aria-pressed={view === "list"}
            >
              📋
            </button>
          </div>
        </div>
      </div>

      {filteredAndSortedClassrooms.length > 0 ? (
        <div
          className={
            view === "grid"
              ? "grid md:grid-cols-3 gap-6"
              : "space-y-3"
          }
        >
          {/* Create new classroom card */}
          <article
            onClick={() => router.push("/dashboard/teacher/classrooms/new")}
            className="rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-500 p-6 text-white flex items-center justify-center text-center cursor-pointer transition-all hover:-translate-y-1 hover:shadow-xl"
            role="button"
            tabIndex={0}
          >
            <div>
              <div className="mb-3 text-5xl flex justify-center">➕</div>
              <h3 className="text-lg font-semibold mb-1">Tạo lớp học mới</h3>
              <p className="text-sm text-white/80 max-w-xs mx-auto">
                Tạo không gian học tập mới cho học sinh của bạn.
              </p>
            </div>
          </article>

          {filteredAndSortedClassrooms.map((classroom: ClassroomResponse) => (
            <article
              key={classroom.id}
              onClick={() =>
                router.push(`/dashboard/teacher/classrooms/${classroom.id}`)
              }
              className="flex flex-col justify-between rounded-2xl bg-white/95 border border-slate-100 shadow-[0_8px_24px_rgba(15,23,42,0.06)] px-5 py-4 sm:px-6 sm:py-5 transition-all duration-200 ease-out cursor-pointer hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(15,23,42,0.12)]"
              role="button"
              tabIndex={0}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 via-emerald-400 to-teal-300 text-white shadow-sm">
                    <span className="text-2xl">
                      {classroom.icon || classroom.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 line-clamp-2">
                      {classroom.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 line-clamp-2">
                      {classroom.description || "Không có mô tả"}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700 border border-emerald-100 whitespace-nowrap">
                  {classroom.isActive ? "Đang hoạt động" : "Đã lưu trữ"}
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between gap-3 text-[11px] sm:text-xs text-slate-600">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 border border-slate-200">
                    <span className="text-xs">#</span>
                    <span>Mã lớp: {classroom.code}</span>
                  </span>
                </div>
                <span className="font-semibold text-emerald-700 whitespace-nowrap">
                  {classroom._count?.students ?? 0} học sinh
                </span>
              </div>
            </article>
          ))}
        </div>
      ) : classrooms && classrooms.length > 0 ? (
        <EmptyState
          variant="teacher"
          icon="🔍"
          title="Không tìm thấy lớp học nào phù hợp với bộ lọc"
          description="Hãy thử thay đổi bộ lọc hoặc xoá từ khóa tìm kiếm."
          action={
            <Button
              type="button"
              variant="outline"
              color="blue"
              onClick={() => {
                setStatusFilter("all");
                setSortBy("newest");
                setSearchQuery("");
              }}
            >
              Đặt lại bộ lọc
            </Button>
          }
        />
      ) : (
        <EmptyState
          variant="teacher"
          icon="📚"
          title="Bạn chưa có lớp học nào"
          description="Bắt đầu bằng việc tạo lớp học mới cho học sinh của bạn."
          action={
            <Button
              type="button"
              color="blue"
              onClick={() =>
                router.push("/dashboard/teacher/classrooms/new")
              }
            >
              Tạo lớp học đầu tiên
            </Button>
          }
        />
      )}
    </>
  );
}