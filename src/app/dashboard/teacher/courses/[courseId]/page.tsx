"use client";

import useSWR from "swr";
import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { ConfirmDialog, PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type CourseDetail = {
  id: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    lessons?: number;
    classrooms?: number;
  };
};

type LessonItem = {
  id: string;
  title: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  content?: string;
};

type ApiResponse<T> = {
  success?: boolean;
  data?: T;
  message?: string;
};

const fetcher = (url: string) =>
  fetch(url).then(async (r) => {
    const json = await r.json().catch(() => ({}));
    if (!r.ok || json?.success === false) throw new Error(json?.message || "fetch error");
    return json as any;
  });

export default function Page() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const courseId = params.courseId as string;

  const { data: courseRes, error: courseErr, isLoading: courseLoading } = useSWR<ApiResponse<CourseDetail>>(
    courseId ? `/api/teachers/courses/${courseId}` : null,
    fetcher
  );

  const {
    data: lessonsRes,
    error: lessonsErr,
    isLoading: lessonsLoading,
    mutate: mutateLessons,
  } = useSWR<ApiResponse<{ items: LessonItem[] }>>(
    courseId ? `/api/teachers/courses/${courseId}/lessons` : null,
    fetcher
  );

  const course = courseRes?.data ?? null;
  const lessons = lessonsRes?.data?.items ?? [];

  const nextOrder = useMemo(() => {
    if (!lessons.length) return 1;
    return Math.max(...lessons.map((l) => l.order)) + 1;
  }, [lessons]);

  const [openCreate, setOpenCreate] = useState(false);
  const [openCreateFromFile, setOpenCreateFromFile] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editing, setEditing] = useState<LessonItem | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState<LessonItem | null>(null);

  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [orderModeAuto, setOrderModeAuto] = useState(true);
  const [order, setOrder] = useState<number>(1);

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadOrderModeAuto, setUploadOrderModeAuto] = useState(true);
  const [uploadOrder, setUploadOrder] = useState<number>(1);

  const resetForm = () => {
    setTitle("");
    setContent("");
    setOrderModeAuto(true);
    setOrder(nextOrder);
  };

  const resetUploadForm = () => {
    setUploadFile(null);
    setUploadTitle("");
    setUploadOrderModeAuto(true);
    setUploadOrder(nextOrder);
  };

  const openCreateDialog = () => {
    resetForm();
    setOpenCreate(true);
  };

  const openCreateFromFileDialog = () => {
    resetUploadForm();
    setOpenCreateFromFile(true);
  };

  const openEditDialog = async (lesson: LessonItem) => {
    try {
      setSaving(true);
      const detail = (await fetcher(`/api/teachers/courses/${courseId}/lessons/${lesson.id}`)) as ApiResponse<LessonItem>;
      const full = detail?.data ?? lesson;
      setEditing(full);
      setTitle(full.title);
      setContent(full.content ?? "");
      setOrderModeAuto(false);
      setOrder(full.order);
      setOpenEdit(true);
    } catch (e) {
      toast({
        title: "Không tải được bài học",
        description: e instanceof Error ? e.message : "Có lỗi xảy ra",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const createLesson = async () => {
    if (!title.trim() || !content.trim()) return;
    try {
      setSaving(true);
      const payload: any = { title: title.trim(), content: content.trim() };
      if (!orderModeAuto) payload.order = order;

      const res = await fetch(`/api/teachers/courses/${courseId}/lessons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Không thể tạo bài học");
      }

      toast({ title: "Đã tạo bài học", variant: "success" });
      setOpenCreate(false);
      await mutateLessons();
    } catch (e) {
      toast({
        title: "Tạo bài học thất bại",
        description: e instanceof Error ? e.message : "Có lỗi xảy ra",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const createLessonFromFile = async () => {
    if (!uploadFile) return;

    try {
      setSaving(true);

      const form = new FormData();
      form.set("file", uploadFile);
      if (uploadTitle.trim()) form.set("title", uploadTitle.trim());
      if (!uploadOrderModeAuto) form.set("order", String(uploadOrder));

      const res = await fetch(`/api/teachers/courses/${courseId}/lessons/file`, {
        method: "POST",
        body: form,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Không thể tạo bài học từ file");
      }

      toast({
        title: "Đã tạo bài học từ file",
        description: `Đã trích xuất ~${json?.data?.extracted?.charCount ?? 0} ký tự`,
        variant: "success",
      });

      setOpenCreateFromFile(false);
      await mutateLessons();
    } catch (e) {
      toast({
        title: "Tạo bài học từ file thất bại",
        description: e instanceof Error ? e.message : "Có lỗi xảy ra",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateLesson = async () => {
    if (!editing) return;
    if (!title.trim() || !content.trim()) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/teachers/courses/${courseId}/lessons/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), content: content.trim(), order }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Không thể cập nhật bài học");
      }

      toast({ title: "Đã cập nhật bài học", variant: "success" });
      setOpenEdit(false);
      setEditing(null);
      await mutateLessons();
    } catch (e) {
      toast({
        title: "Cập nhật thất bại",
        description: e instanceof Error ? e.message : "Có lỗi xảy ra",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const askDelete = (lesson: LessonItem) => {
    setDeleting(lesson);
    setConfirmDeleteOpen(true);
  };

  const doDelete = async () => {
    if (!deleting) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/teachers/courses/${courseId}/lessons/${deleting.id}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Không thể xóa bài học");
      }

      toast({ title: "Đã xóa bài học", variant: "success" });
      setConfirmDeleteOpen(false);
      setDeleting(null);
      await mutateLessons();
    } catch (e) {
      toast({
        title: "Xóa thất bại",
        description: e instanceof Error ? e.message : "Có lỗi xảy ra",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (courseLoading) {
    return (
      <div className="p-8">
        <div className="h-8 w-64 bg-slate-100 rounded animate-pulse" />
        <div className="h-4 w-96 bg-slate-100 rounded animate-pulse mt-3" />
      </div>
    );
  }

  if (courseErr) {
    return (
      <div className="p-8">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
          Không tải được khóa học.
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-700">
          Không tìm thấy khóa học.
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        role="teacher"
        title={course.title}
        subtitle={course.description || "Quản lý bài học trong khóa học này."}
        showIcon={false}
        actions={
          <div className="hidden sm:flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push("/dashboard/teacher/courses")}>
              Quay lại
            </Button>
            <Button variant="outline" onClick={openCreateFromFileDialog}>
              Tạo từ file
            </Button>
            <Button onClick={openCreateDialog}>
              Thêm bài học
            </Button>
          </div>
        }
      />

      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="text-sm font-semibold text-slate-900">Bài học</div>
          <Button variant="outline" onClick={() => mutateLessons()} disabled={lessonsLoading}>
            {lessonsLoading ? "Đang tải..." : "Tải lại"}
          </Button>
        </div>

        {lessonsLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : lessonsErr ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
            Không tải được danh sách bài học.
          </div>
        ) : lessons.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-700">
            Chưa có bài học. Hãy thêm bài học đầu tiên.
          </div>
        ) : (
          <div className="space-y-3">
            {lessons.map((l) => (
              <div key={l.id} className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 p-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center text-[11px] font-extrabold">
                    BÀI
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">{l.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Thứ tự: {l.order} • Cập nhật: {new Date(l.updatedAt).toLocaleDateString("vi-VN")}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => openEditDialog(l)} disabled={saving}>
                    Sửa
                  </Button>
                  <Button variant="outline" onClick={() => askDelete(l)} disabled={saving}>
                    Xóa
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={openCreate} onOpenChange={(v) => setOpenCreate(v)}>
        <DialogContent onClose={() => setOpenCreate(false)}>
          <DialogHeader variant="teacher">
            <DialogTitle variant="teacher">Thêm bài học</DialogTitle>
          </DialogHeader>

          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-semibold text-slate-800">Tiêu đề</div>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} disabled={saving} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-800">Thứ tự</div>
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={orderModeAuto}
                    onChange={(e) => setOrderModeAuto(e.target.checked)}
                    disabled={saving}
                  />
                  Tự động
                </label>
              </div>
              <NumberInput
                value={orderModeAuto ? nextOrder : order}
                onChange={setOrder}
                min={1}
                max={10000}
                color="blue"
                ariaLabel="Thứ tự bài học"
                className={orderModeAuto ? "opacity-60 pointer-events-none" : ""}
              />
              <div className="text-xs text-slate-500">
                {orderModeAuto ? `Hệ thống sẽ đặt thứ tự = ${nextOrder}` : "Bạn tự đặt thứ tự hiển thị."}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-semibold text-slate-800">Nội dung</div>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={10}
                placeholder="Nhập nội dung bài học để Tutor có dữ liệu trả lời..."
                disabled={saving}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)} disabled={saving}>
              Hủy
            </Button>
            <Button onClick={createLesson} disabled={saving || !title.trim() || !content.trim()}>
              {saving ? "Đang lưu..." : "Tạo bài học"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openCreateFromFile} onOpenChange={(v) => setOpenCreateFromFile(v)}>
        <DialogContent onClose={() => setOpenCreateFromFile(false)}>
          <DialogHeader variant="teacher">
            <DialogTitle variant="teacher">Tạo bài học từ file</DialogTitle>
          </DialogHeader>

          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-semibold text-slate-800">File nguồn (PDF/DOCX/TXT)</div>
              <input
                type="file"
                accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                disabled={saving}
              />
              <div className="text-xs text-slate-500">
                File sẽ được trích xuất văn bản và dùng làm nội dung bài học (giới hạn ~20k ký tự).
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-semibold text-slate-800">Tiêu đề (tuỳ chọn)</div>
              <Input
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="Mặc định sẽ lấy theo tên file"
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-800">Thứ tự</div>
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={uploadOrderModeAuto}
                    onChange={(e) => setUploadOrderModeAuto(e.target.checked)}
                    disabled={saving}
                  />
                  Tự động
                </label>
              </div>
              <NumberInput
                value={uploadOrderModeAuto ? nextOrder : uploadOrder}
                onChange={setUploadOrder}
                min={1}
                max={10000}
                color="blue"
                ariaLabel="Thứ tự bài học (file)"
                className={uploadOrderModeAuto ? "opacity-60 pointer-events-none" : ""}
              />
              <div className="text-xs text-slate-500">
                {uploadOrderModeAuto ? `Hệ thống sẽ đặt thứ tự = ${nextOrder}` : "Bạn tự đặt thứ tự hiển thị."}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreateFromFile(false)} disabled={saving}>
              Hủy
            </Button>
            <Button onClick={createLessonFromFile} disabled={saving || !uploadFile}>
              {saving ? "Đang xử lý..." : "Tạo bài học"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openEdit} onOpenChange={(v) => setOpenEdit(v)}>
        <DialogContent onClose={() => setOpenEdit(false)}>
          <DialogHeader variant="teacher">
            <DialogTitle variant="teacher">Sửa bài học</DialogTitle>
          </DialogHeader>

          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-semibold text-slate-800">Tiêu đề</div>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} disabled={saving} />
            </div>

            <div className="space-y-2">
              <div className="text-sm font-semibold text-slate-800">Thứ tự</div>
              <NumberInput value={order} onChange={setOrder} min={1} max={10000} color="blue" ariaLabel="Thứ tự bài học" />
            </div>

            <div className="space-y-2">
              <div className="text-sm font-semibold text-slate-800">Nội dung</div>
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={10} disabled={saving} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenEdit(false)} disabled={saving}>
              Hủy
            </Button>
            <Button onClick={updateLesson} disabled={saving || !title.trim() || !content.trim()}>
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        onConfirm={doDelete}
        title="Xóa bài học?"
        description={deleting ? `Bài học “${deleting.title}” sẽ bị xóa vĩnh viễn.` : undefined}
        variant="danger"
        confirmText="Xóa"
        cancelText="Hủy"
        loading={saving}
      />
    </div>
  );
}

