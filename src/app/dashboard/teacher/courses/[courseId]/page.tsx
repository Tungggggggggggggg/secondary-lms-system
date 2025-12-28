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

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const fetcher = async <T,>(url: string): Promise<ApiResponse<T>> => {
  const r = await fetch(url);
  const json: unknown = await r.json().catch(() => ({}));

  const record = isRecord(json) ? json : {};
  const success = typeof record.success === "boolean" ? record.success : undefined;
  const message = typeof record.message === "string" ? record.message : undefined;
  const data = (record.data as T | undefined) ?? undefined;

  if (!r.ok || success === false) throw new Error(message || "fetch error");

  return { success, data, message };
};

export default function Page() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const courseId = params.courseId as string;

  const { data: courseRes, error: courseErr, isLoading: courseLoading } = useSWR<ApiResponse<CourseDetail>>(
    courseId ? `/api/teachers/courses/${courseId}` : null,
    (url: string) => fetcher<CourseDetail>(url)
  );

  const {
    data: lessonsRes,
    error: lessonsErr,
    isLoading: lessonsLoading,
    mutate: mutateLessons,
  } = useSWR<ApiResponse<{ items: LessonItem[] }>>(
    courseId ? `/api/teachers/courses/${courseId}/lessons` : null,
    (url: string) => fetcher<{ items: LessonItem[] }>(url)
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

  const [openPreview, setOpenPreview] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewLesson, setPreviewLesson] = useState<
    (LessonItem & { attachments?: { id: string; name: string; mimeType: string; url?: string | null }[] }) | null
  >(null);

  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [orderModeAuto, setOrderModeAuto] = useState(true);
  const [order, setOrder] = useState<number>(1);
  const [attachments, setAttachments] = useState<
    { id: string; name: string; mimeType: string; url?: string | null }[]
  >([]);
  const [showContentEditor, setShowContentEditor] = useState(true);
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<string | null>(null);
  const [openingAttachmentId, setOpeningAttachmentId] = useState<string | null>(null);

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadOrderModeAuto, setUploadOrderModeAuto] = useState(true);
  const [uploadOrder, setUploadOrder] = useState<number>(1);

  const resetForm = () => {
    setTitle("");
    setContent("");
    setOrderModeAuto(true);
    setOrder(nextOrder);
    setAttachments([]);
    setShowContentEditor(true);
  };

  const resetUploadForm = () => {
    setUploadFile(null);
    setUploadTitle("");
    setUploadOrderModeAuto(true);
    setUploadOrder(nextOrder);
  };

  const handleDownloadAttachment = async (file: { id: string; name: string; url?: string | null }) => {
    if (!file.url || downloadingAttachmentId) return;
    try {
      setDownloadingAttachmentId(file.id);
      const response = await fetch(file.url);
      if (!response.ok) {
        throw new Error("Download failed");
      }
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = file.name || "lesson-file";
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.error("[TeacherCourseLesson] Download attachment error", e);
    } finally {
      setDownloadingAttachmentId(null);
    }
  };

  const handleOpenAttachment = async (file: { id: string; url?: string | null }) => {
    if (!file.url || openingAttachmentId) return;
    try {
      setOpeningAttachmentId(file.id);
      window.open(file.url, "_blank", "noopener,noreferrer");
    } finally {
      setOpeningAttachmentId(null);
    }
  };

  const openLessonAttachment = async (lesson: LessonItem) => {
    try {
      setOpeningAttachmentId(lesson.id);
      const detail = (await fetcher<
        LessonItem & {
          attachments?: { id: string; name: string; mimeType: string; url?: string | null }[];
        }
      >(`/api/teachers/courses/${courseId}/lessons/${lesson.id}`)) as ApiResponse<
        LessonItem & {
          attachments?: { id: string; name: string; mimeType: string; url?: string | null }[];
        }
      >;

      const attachments = (detail?.data as any)?.attachments as
        | { id: string; name: string; mimeType: string; url?: string | null }[]
        | undefined;
      const url = attachments?.find((a) => !!a.url)?.url ?? null;

      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
        return;
      }

      await openPreviewDialog(lesson);
    } catch (e) {
      toast({
        title: "Không thể xem tệp",
        description: e instanceof Error ? e.message : "Có lỗi xảy ra",
        variant: "destructive",
      });
    } finally {
      setOpeningAttachmentId(null);
    }
  };

  const openPreviewDialog = async (lesson: LessonItem) => {
    try {
      setOpenPreview(true);
      setPreviewLesson(null);
      setPreviewLoading(true);
      const detail = (await fetcher<LessonItem & {
        attachments?: { id: string; name: string; mimeType: string; url?: string | null }[];
      }>(`/api/teachers/courses/${courseId}/lessons/${lesson.id}`)) as ApiResponse<
        LessonItem & {
          attachments?: { id: string; name: string; mimeType: string; url?: string | null }[];
        }
      >;
      setPreviewLesson((detail?.data as any) ?? (lesson as any));
    } catch (e) {
      toast({
        title: "Không tải được nội dung bài học",
        description: e instanceof Error ? e.message : "Có lỗi xảy ra",
        variant: "destructive",
      });
      setOpenPreview(false);
    } finally {
      setPreviewLoading(false);
    }
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
      const detail = (await fetcher<LessonItem & {
        attachments?: { id: string; name: string; mimeType: string; url?: string | null }[];
      }>(`/api/teachers/courses/${courseId}/lessons/${lesson.id}`)) as ApiResponse<
        LessonItem & {
          attachments?: { id: string; name: string; mimeType: string; url?: string | null }[];
        }
      >;

      const full = detail?.data ?? (lesson as LessonItem);
      setEditing(full);
      setTitle(full.title);
      setContent(full.content ?? "");
      setOrderModeAuto(false);
      setOrder(full.order);
      const nextAttachments = (full as any).attachments as
        | { id: string; name: string; mimeType: string; url?: string | null }[]
        | undefined;
      setAttachments(nextAttachments ?? []);
      setShowContentEditor(!(nextAttachments && nextAttachments.length > 0));
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
      <div className="space-y-3">
        <div className="h-8 w-64 bg-muted rounded animate-pulse" />
        <div className="h-4 w-96 bg-muted rounded animate-pulse mt-3" />
      </div>
    );
  }

  if (courseErr) {
    return (
      <div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
          Không tải được khóa học.
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div>
        <div className="rounded-2xl border border-border bg-card p-6 text-muted-foreground">
          Không tìm thấy khóa học.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

      <div className="bg-card rounded-2xl border border-border p-5">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="text-sm font-semibold text-foreground">Bài học</div>
        </div>

        {lessonsLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : lessonsErr ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
            Không tải được danh sách bài học.
          </div>
        ) : lessons.length === 0 ? (
          <div className="rounded-xl border border-border bg-muted/40 p-4 text-muted-foreground">
            Chưa có bài học. Hãy thêm bài học đầu tiên.
          </div>
        ) : (
          <div className="space-y-3">
            {lessons.map((l) => (
              <div
                key={l.id}
                onClick={() => openPreviewDialog(l)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openPreviewDialog(l);
                  }
                }}
                role="button"
                tabIndex={0}
                className="w-full text-left flex items-start justify-between gap-3 rounded-2xl border border-border p-4 hover:bg-muted/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center text-[11px] font-extrabold">
                    BÀI
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">{l.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Thứ tự: {l.order} • Cập nhật: {new Date(l.updatedAt).toLocaleDateString("vi-VN")}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button onClick={() => openLessonAttachment(l)} disabled={saving || openingAttachmentId === l.id}>
                    Xem
                  </Button>
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

      <Dialog open={openPreview} onOpenChange={(v) => setOpenPreview(v)}>
        <DialogContent onClose={() => setOpenPreview(false)}>
          <DialogHeader variant="teacher">
            <DialogTitle variant="teacher">Xem bài học</DialogTitle>
          </DialogHeader>

          <div className="p-6 space-y-4">
            {previewLoading ? (
              <div className="space-y-3">
                <div className="h-6 w-2/3 rounded bg-slate-100 animate-pulse" />
                <div className="h-4 w-1/2 rounded bg-slate-100 animate-pulse" />
                <div className="h-40 w-full rounded bg-slate-100 animate-pulse" />
              </div>
            ) : previewLesson ? (
              <>
                <div className="space-y-1">
                  <div className="text-lg font-extrabold text-slate-900">{previewLesson.title}</div>
                  <div className="text-xs text-slate-500">
                    Thứ tự: {previewLesson.order} • Cập nhật: {new Date(previewLesson.updatedAt).toLocaleString("vi-VN")}
                  </div>
                </div>

                {(previewLesson as any).attachments && (previewLesson as any).attachments.length > 0 ? (
                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-slate-900">Tệp đính kèm</div>
                    <div className="space-y-2">
                      {(previewLesson as any).attachments.map((file: any) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-900 truncate">{file.name}</div>
                            <div className="text-xs text-slate-500 truncate">{file.mimeType || "application/octet-stream"}</div>
                          </div>
                          {file.url ? (
                            <div className="shrink-0 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenAttachment(file)}
                                disabled={openingAttachmentId === file.id}
                                className="inline-flex items-center justify-center rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                {openingAttachmentId === file.id ? "Đang mở..." : "Xem"}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadAttachment(file)}
                                disabled={downloadingAttachmentId === file.id}
                                className="inline-flex items-center justify-center rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                {downloadingAttachmentId === file.id ? "Đang tải..." : "Tải về"}
                              </button>
                            </div>
                          ) : (
                            <span className="shrink-0 text-xs text-slate-400">Không có link</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="space-y-2">
                  <div className="text-sm font-semibold text-slate-900">Nội dung</div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-800 whitespace-pre-line max-h-[52vh] overflow-auto">
                    {previewLesson.content ? previewLesson.content : "(Bài học chưa có nội dung)"}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-sm text-slate-600">Không có dữ liệu để hiển thị.</div>
            )}
          </div>
        </DialogContent>
      </Dialog>

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

            {attachments && attachments.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-semibold text-slate-800">Tệp nguồn của bài học</div>
                <p className="text-xs text-slate-500">
                  Những tệp này là bản gốc khi tạo bài học. Bạn có thể tải về để xem đầy đủ định dạng.
                </p>
                <div className="space-y-2">
                  {attachments.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center text-[11px] font-extrabold flex-shrink-0">
                          {(() => {
                            const mt = (file.mimeType || "").toLowerCase();
                            if (mt.includes("pdf")) return "PDF";
                            if (mt.includes("word") || mt.includes("doc")) return "DOC";
                            if (mt.includes("text")) return "TXT";
                            return "TỆP";
                          })()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900 truncate">
                            {file.name}
                          </div>
                          <div className="text-xs text-slate-500 truncate">
                            {file.mimeType || "application/octet-stream"}
                          </div>
                        </div>
                      </div>
                      {file.url ? (
                        <div className="shrink-0 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenAttachment(file)}
                            disabled={openingAttachmentId === file.id}
                            className="inline-flex items-center justify-center rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {openingAttachmentId === file.id ? "Đang mở..." : "Xem"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadAttachment(file)}
                            disabled={downloadingAttachmentId === file.id}
                            className="inline-flex items-center justify-center rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {downloadingAttachmentId === file.id ? "Đang tải..." : "Tải về"}
                          </button>
                        </div>
                      ) : (
                        <span className="shrink-0 text-xs text-slate-400">
                          Không tạo được link tải
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-800">Nội dung văn bản</div>
                {attachments && attachments.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowContentEditor((v) => !v)}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    {showContentEditor ? "Ẩn nội dung" : "Hiện nội dung"}
                  </button>
                )}
              </div>
              {(!attachments || attachments.length === 0 || showContentEditor) ? (
                <>
                  {attachments && attachments.length > 0 && (
                    <div className="text-xs text-slate-500">
                      Đây là văn bản đã được trích từ file nguồn và dùng cho Tutor. Bạn có thể chỉnh sửa nếu cần.
                    </div>
                  )}
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={10}
                    disabled={saving}
                  />
                </>
              ) : (
                <div className="text-xs text-slate-500">
                  Văn bản đã được trích từ file và đang được ẩn. Nhấn "Hiện nội dung" nếu bạn muốn xem hoặc chỉnh sửa.
                </div>
              )}
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

