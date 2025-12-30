"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ClassroomResponse } from "@/types/classroom";
import ClassroomListSkeleton from "@/components/teacher/classrooms/ClassroomListSkeleton";
import { EmptyState } from "@/components/shared";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useClassroomsQuery } from "@/hooks/use-classrooms-query";
import { Search as SearchIcon, Lock, BookOpen } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function ClassroomList() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const isTeacher = session?.user?.role === "TEACHER";
  const enabled = status === "authenticated" && isTeacher;

  if (status === "loading") {
    return <ClassroomListSkeleton />;
  }

  if (status === "authenticated" && !isTeacher) {
    return (
      <EmptyState
        variant="teacher"
        icon={<Lock className="h-12 w-12 text-blue-600" />}
        title="Chức năng dành cho giáo viên"
        description="Vui lòng đăng nhập bằng tài khoản giáo viên hoặc chuyển vai trò sang Giáo viên."
      />
    );
  }

  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name" | "students">("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteClassroom, setInviteClassroom] = useState<ClassroomResponse | null>(null);

  // Map sort -> API params
  const sortKey: "createdAt" | "name" | "students" =
    sortBy === "name" ? "name" : sortBy === "students" ? "students" : "createdAt";
  const sortDir: "asc" | "desc" = sortBy === "oldest" || sortBy === "name" ? "asc" : "desc";

  const { items, total, loading: isLoading, error, page, pageSize, setPage } = useClassroomsQuery({
    search: searchQuery,
    status: "all",
    sortKey,
    sortDir,
    page: 1,
    pageSize: 12,
    enabled,
  });

  // Logging lỗi nếu có
  useEffect(() => {
    if (error) {
      console.error('[ClassroomList] Lỗi:', error);
    }
  }, [error]);

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

  // Tính toán phân trang
  const totalPages = Math.max(1, Math.ceil((total || 0) / pageSize));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <>
      {/* Filter & Search */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center mb-8">
        <div className="relative md:justify-self-start w-full">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
            <SearchIcon className="h-4 w-4" />
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
        </div>
      </div>

      {items.length > 0 ? (
        <div className="grid md:grid-cols-3 gap-6">
          {items.map((classroom: ClassroomResponse) => (
            <article
              key={classroom.id}
              onClick={() => router.push(`/dashboard/teacher/classrooms/${classroom.id}`)}
              onKeyDown={(e) => {
                if (e.currentTarget !== e.target) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  router.push(`/dashboard/teacher/classrooms/${classroom.id}`);
                }
              }}
              className="flex flex-col justify-between rounded-2xl bg-white/95 border border-slate-100 shadow-[0_8px_24px_rgba(15,23,42,0.06)] px-5 py-4 sm:px-6 sm:py-5 transition-all duration-200 ease-out cursor-pointer hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(15,23,42,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
                  {classroom.code ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 border border-slate-200">
                      <span className="text-xs">#</span>
                      <span>Mã lớp: {classroom.code}</span>
                    </span>
                  ) : null}
                </div>
                <span className="font-semibold text-emerald-700 whitespace-nowrap">
                  {classroom._count?.students ?? 0} học sinh
                </span>
              </div>

              <div className="mt-3 flex items-center justify-end">
                <button
                  type="button"
                  className="text-blue-700 hover:underline text-xs"
                  onClick={(e) => { e.stopPropagation(); setInviteClassroom(classroom); setInviteOpen(true); }}
                  aria-label={`Xem mã mời lớp ${classroom.name}`}
                >
                  Mã mời
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : total > 0 ? (
        <EmptyState
          variant="teacher"
          icon={<SearchIcon className="h-12 w-12 text-blue-600" />}
          title="Không tìm thấy lớp học nào phù hợp với bộ lọc"
          description="Hãy thử thay đổi bộ lọc hoặc xoá từ khóa tìm kiếm."
          action={
            <Button
              type="button"
              variant="outline"
              color="blue"
              onClick={() => {
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
          icon={<BookOpen className="h-12 w-12 text-blue-600" />}
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

      {/* Pagination */}
      {total > pageSize && (
        <div className="flex items-center justify-between mt-6 text-sm text-slate-600">
          <div>
            Trang {page} · Mỗi trang {pageSize}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={!canPrev}
              aria-label="Trang trước"
            >
              Trước
            </Button>
            <Button
              type="button"
              onClick={() => setPage(page + 1)}
              disabled={!canNext}
              aria-label="Trang tiếp"
            >
              Tiếp
            </Button>
          </div>
        </div>
      )}

      {/* Invite code dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent onClose={() => setInviteOpen(false)}>
          <DialogHeader variant="teacher">
            <DialogTitle variant="teacher">Mã mời lớp</DialogTitle>
            <DialogDescription variant="teacher">Chia sẻ mã để học sinh tham gia lớp học.</DialogDescription>
          </DialogHeader>
          <div className="px-6 py-5 space-y-3">
            <div className="text-sm text-slate-600">Lớp: <span className="font-semibold text-slate-900">{inviteClassroom?.name}</span></div>
            <div className="flex items-center gap-3">
              <div className="text-2xl font-bold tracking-widest text-blue-700 bg-blue-50 rounded-xl px-4 py-2 border border-blue-200">{inviteClassroom?.code}</div>
              <Button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(`${window.location.origin}/join/${inviteClassroom?.code}`);
                }}
                aria-label="Sao chép liên kết mời"
              >Sao chép link</Button>
            </div>
            <div className="text-xs text-slate-500">Link: {typeof window !== 'undefined' ? `${window.location.origin}/join/${inviteClassroom?.code}` : ''}</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
