"use client";

import useSWR from "swr";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

type TeacherCourse = {
  id: string;
  title: string;
  description: string | null;
  updatedAt: string;
};

type AssignedCourse = {
  id: string;
  title: string;
  description: string | null;
  addedAt: string;
  updatedAt: string;
};

type CoursesApi = {
  success?: boolean;
  data?: { items?: TeacherCourse[]; total?: number };
  pagination?: { page: number; pageSize: number; total: number; totalPages: number; hasMore?: boolean };
  message?: string;
};

type AssignedApi = {
  success?: boolean;
  data?: { items?: AssignedCourse[]; total?: number };
  pagination?: { page: number; pageSize: number; total: number; totalPages: number; hasMore?: boolean };
  message?: string;
};

const fetcher = (url: string) =>
  fetch(url).then(async (r) => {
    const json = await r.json().catch(() => ({}));
    if (!r.ok || json?.success === false) throw new Error(json?.message || "fetch error");
    return json as any;
  });

export default function TeacherClassroomCoursesPage() {
  const params = useParams();
  const classroomId = params.classroomId as string;
  const router = useRouter();
  const { toast } = useToast();

  const [addingId, setAddingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const [availableQInput, setAvailableQInput] = useState<string>("");
  const [availableQ, setAvailableQ] = useState<string>("");
  const [availablePage, setAvailablePage] = useState<number>(1);
  const availablePageSize = 12;

  const [assignedQInput, setAssignedQInput] = useState<string>("");
  const [assignedQ, setAssignedQ] = useState<string>("");
  const [assignedPage, setAssignedPage] = useState<number>(1);
  const assignedPageSize = 12;

  const busy = !!addingId || !!removingId;

  useEffect(() => {
    const t = setTimeout(() => {
      setAvailableQ(availableQInput.trim());
      setAvailablePage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [availableQInput]);

  useEffect(() => {
    const t = setTimeout(() => {
      setAssignedQ(assignedQInput.trim());
      setAssignedPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [assignedQInput]);

  const {
    data: availableRes,
    isLoading: availableLoading,
    error: availableError,
    mutate: mutateAvailable,
  } = useSWR<CoursesApi>(
    classroomId && addDialogOpen
      ? `/api/teachers/courses?excludeClassroomId=${classroomId}&q=${encodeURIComponent(availableQ)}&page=${availablePage}&pageSize=${availablePageSize}`
      : null,
    fetcher
  );

  const {
    data: assignedRes,
    isLoading: assignedLoading,
    error: assignedError,
    mutate: mutateAssigned,
  } = useSWR<AssignedApi>(
    classroomId
      ? `/api/teachers/classrooms/${classroomId}/courses?q=${encodeURIComponent(assignedQ)}&page=${assignedPage}&pageSize=${assignedPageSize}`
      : null,
    fetcher
  );

  const availableCourses = availableRes?.data?.items ?? [];
  const availablePagination = availableRes?.pagination;
  const assigned = assignedRes?.data?.items ?? [];
  const assignedPagination = assignedRes?.pagination;

  const addCourse = async (courseId: string) => {
    if (!courseId) return;
    try {
      setAddingId(courseId);
      const res = await fetch(`/api/teachers/classrooms/${classroomId}/courses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Không thể gán khóa học vào lớp");
      }
      await Promise.all([mutateAssigned(), mutateAvailable()]);
      toast({ title: "Đã gán khóa học", variant: "success" });
    } catch (e) {
      toast({
        title: "Gán thất bại",
        description: e instanceof Error ? e.message : "Có lỗi xảy ra",
        variant: "destructive",
      });
    } finally {
      setAddingId(null);
    }
  };

  const removeCourse = async (courseId: string) => {
    try {
      setRemovingId(courseId);
      const res = await fetch(`/api/teachers/classrooms/${classroomId}/courses/${courseId}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Không thể gỡ khóa học");
      }
      await Promise.all([mutateAssigned(), mutateAvailable()]);
      toast({ title: "Đã gỡ khóa học", variant: "success" });
    } catch (e) {
      toast({
        title: "Gỡ thất bại",
        description: e instanceof Error ? e.message : "Có lỗi xảy ra",
        variant: "destructive",
      });
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        role="teacher"
        title="Khóa học trong lớp"
        subtitle="Gán khóa học để học sinh xem bài học và dùng Tutor."
        showIcon={false}
      />

      <div className="flex justify-end">
        <Button type="button" color="blue" onClick={() => setAddDialogOpen(true)} disabled={busy}>
          Thêm khóa học
        </Button>
      </div>

      {assignedLoading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
              <div className="h-4 w-40 bg-slate-100 rounded" />
              <div className="h-3 w-56 bg-slate-100 rounded mt-3" />
              <div className="h-10 w-44 bg-slate-100 rounded-xl mt-4" />
            </div>
          ))}
        </div>
      ) : assignedError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700">
          <div className="font-semibold">Không tải được danh sách khóa học trong lớp.</div>
          <div className="mt-3">
            <Button variant="outline" onClick={() => mutateAssigned()} disabled={busy}>
              Thử lại
            </Button>
          </div>
        </div>
      ) : assigned.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-700">
          <div className="text-sm font-semibold text-slate-900">Chưa có khóa học</div>
          <div className="text-sm text-slate-600 mt-1">Hãy gán một khóa học để học sinh có thể bắt đầu học.</div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-slate-900">Khóa học đã gán</div>
            <div className="text-xs text-slate-500">{assignedPagination?.total ?? assigned.length} khóa học</div>
          </div>

          <div className="w-full sm:max-w-sm">
            <Input
              value={assignedQInput}
              onChange={(e) => setAssignedQInput(e.target.value)}
              placeholder="Tìm khóa học đã gán..."
              className="h-11"
              color="blue"
              disabled={busy}
              aria-label="Tìm khóa học đã gán"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {assigned.map((c) => (
              <div key={c.id} className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-blue-200 hover:bg-blue-50/20 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center text-[11px] font-extrabold shrink-0">
                        KH
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 truncate">{c.title}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Gán lúc: {new Date(c.addedAt).toLocaleDateString("vi-VN")}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <div className="inline-flex h-10 rounded-xl border border-slate-200 bg-white overflow-hidden">
                      <button
                        type="button"
                        onClick={() => router.push(`/dashboard/teacher/courses/${c.id}`)}
                        disabled={busy}
                        className="h-10 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                      >
                        Quản lý
                      </button>
                      <div className="w-px bg-slate-200" aria-hidden="true" />
                      <button
                        type="button"
                        onClick={() => removeCourse(c.id)}
                        disabled={busy}
                        className="h-10 px-4 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                      >
                        {removingId === c.id ? "Đang gỡ..." : "Gỡ"}
                      </button>
                    </div>
                  </div>
                </div>

                {c.description && <p className="text-sm text-slate-600 mt-3 line-clamp-3">{c.description}</p>}
              </div>
            ))}
          </div>

          {assignedPagination && assignedPagination.total > assignedPagination.pageSize ? (
            <div className="flex items-center justify-between gap-3 text-sm text-slate-600">
              <div>
                Trang <span className="font-semibold text-slate-900">{assignedPagination.page}</span> / {assignedPagination.totalPages} • Tổng{" "}
                <span className="font-semibold text-slate-900">{assignedPagination.total.toLocaleString("vi-VN")}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAssignedPage((p) => Math.max(1, p - 1))}
                  disabled={busy || assignedPagination.page <= 1}
                >
                  Trước
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAssignedPage((p) => p + 1)}
                  disabled={busy || assignedPagination.page >= assignedPagination.totalPages}
                >
                  Sau
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      <Dialog
        open={addDialogOpen}
        onOpenChange={(v) => {
          setAddDialogOpen(v);
          if (!v) {
            setAvailableQInput("");
            setAvailableQ("");
            setAvailablePage(1);
          }
        }}
      >
        <DialogContent onClose={() => setAddDialogOpen(false)}>
          <DialogHeader variant="teacher">
            <DialogTitle variant="teacher">Thêm khóa học vào lớp</DialogTitle>
          </DialogHeader>

          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-semibold text-slate-900">Tìm khóa học</div>
              <Input
                value={availableQInput}
                onChange={(e) => setAvailableQInput(e.target.value)}
                placeholder="Nhập tên khóa học..."
                className="h-11"
                color="blue"
                disabled={busy}
                aria-label="Tìm khóa học để gán"
              />
            </div>

            {availableLoading ? (
              <div className="grid md:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
                    <div className="h-4 w-40 bg-slate-100 rounded" />
                    <div className="h-3 w-56 bg-slate-100 rounded mt-3" />
                    <div className="h-10 w-44 bg-slate-100 rounded-xl mt-4" />
                  </div>
                ))}
              </div>
            ) : availableError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700">
                <div className="font-semibold">Không tải được danh sách khóa học.</div>
                <div className="mt-3">
                  <Button variant="outline" onClick={() => mutateAvailable()} disabled={busy}>
                    Thử lại
                  </Button>
                </div>
              </div>
            ) : availableCourses.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-700">
                <div className="text-sm font-semibold text-slate-900">Không có khóa học phù hợp</div>
                <div className="text-sm text-slate-600 mt-1">Thử đổi từ khóa tìm kiếm.</div>
              </div>
            ) : (
              <>
                <div className="grid md:grid-cols-2 gap-4">
                  {availableCourses.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => addCourse(c.id)}
                      disabled={busy}
                      className="text-left bg-white rounded-2xl border border-slate-200 p-5 hover:border-blue-200 hover:bg-blue-50/20 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900 truncate">{c.title}</div>
                          {c.description ? (
                            <p className="text-sm text-slate-600 mt-2 line-clamp-3">{c.description}</p>
                          ) : null}
                        </div>
                        <div className="shrink-0">
                          <span className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
                            {addingId === c.id ? "Đang gán..." : "Gán"}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {availablePagination && availablePagination.total > availablePagination.pageSize ? (
                  <div className="flex items-center justify-between gap-3 text-sm text-slate-600">
                    <div>
                      Trang <span className="font-semibold text-slate-900">{availablePagination.page}</span> / {availablePagination.totalPages} • Tổng{" "}
                      <span className="font-semibold text-slate-900">{availablePagination.total.toLocaleString("vi-VN")}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setAvailablePage((p) => Math.max(1, p - 1))}
                        disabled={busy || availablePagination.page <= 1}
                      >
                        Trước
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setAvailablePage((p) => p + 1)}
                        disabled={busy || availablePagination.page >= availablePagination.totalPages}
                      >
                        Sau
                      </Button>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
