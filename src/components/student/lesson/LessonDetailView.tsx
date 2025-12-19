"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { PageHeader } from "@/components/shared";
import { EmptyState } from "@/components/shared";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LessonTutorChat from "@/components/student/lesson/LessonTutorChat";
import { getChatFileUrl } from "@/lib/supabase-upload";
import { useRouter } from "next/navigation";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Attachment = { id: string; name: string; storagePath: string; mimeType: string };
type LessonDetail = {
  id: string;
  title: string;
  description?: string | null;
  content?: string | null; // plain text or HTML (we render as plain text to keep safe)
  teacher?: { fullname: string; email?: string | null } | null;
  publishedAt?: string | null;
  attachments?: Attachment[];
  links?: { url: string; createdAt: string }[];
  prevLessonId?: string | null;
  nextLessonId?: string | null;
};

interface Props {
  classId: string;
  lessonId: string;
}

export default function LessonDetailView({ classId, lessonId }: Props) {
  const router = useRouter();
  const { data, error, isLoading } = useSWR(
    `/api/students/classes/${classId}/lessons/${lessonId}`,
    fetcher
  );

  const lesson: LessonDetail | null = data?.data ?? null;

  const pdfAttachment = lesson?.attachments?.find((a) => (a.mimeType || "").toLowerCase().includes("pdf")) ?? null;
  const pdfUrl = pdfAttachment ? getChatFileUrl(pdfAttachment.storagePath, "assignments") : null;

  const [contentView, setContentView] = useState<"original" | "text">("text");
  useEffect(() => {
    setContentView(pdfUrl ? "original" : "text");
  }, [pdfUrl]);

  // Local progress (mark as done) stored in localStorage
  const storageKey = `lesson:done:${lessonId}`;
  const [done, setDone] = useState<boolean>(false);
  useEffect(() => {
    try {
      const v = localStorage.getItem(storageKey);
      setDone(v === "1");
    } catch {}
  }, [storageKey]);

  const toggleDone = () => {
    const next = !done;
    setDone(next);
    try {
      localStorage.setItem(storageKey, next ? "1" : "0");
    } catch {}
  };

  const title = lesson?.title || "Bài học";
  const subtitle = lesson?.description || "Xem nội dung bài học và tài nguyên đi kèm.";

  return (
    <div className="space-y-6">
      <PageHeader
        role="student"
        title={title}
        subtitle={subtitle}
        showIcon={false}
        badge={
          <button
            type="button"
            onClick={toggleDone}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
              done ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-background text-foreground border-border hover:bg-muted/40"
            }`}
            aria-pressed={done}
          >
            <span className={`h-2.5 w-2.5 rounded-full ${done ? "bg-emerald-600" : "bg-muted-foreground/40"}`} aria-hidden="true" />
            {done ? "Đã hoàn thành" : "Đánh dấu đã học"}
          </button>
        }
      />

      {/* Meta */}
      {lesson && (
        <div className="bg-card rounded-2xl border border-border p-4 sm:p-5 flex flex-wrap items-center gap-4 text-sm">
          {lesson.teacher?.fullname && (
            <div className="inline-flex items-center gap-2 text-foreground">
              <span className="h-2.5 w-2.5 rounded-full bg-green-600" aria-hidden="true" />
              <span className="font-medium">{lesson.teacher.fullname}</span>
            </div>
          )}
          {lesson.publishedAt && (
            <div className="inline-flex items-center gap-2 text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/60" aria-hidden="true" />
              <span>
                Phát hành: {new Date(lesson.publishedAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="content" className="w-full">
        <TabsList className="bg-green-100/60 text-green-700">
          <TabsTrigger value="content" className="data-[state=active]:bg-green-200 data-[state=active]:text-green-900 focus-visible:ring-ring">Nội dung</TabsTrigger>
          <TabsTrigger value="tutor" className="data-[state=active]:bg-green-200 data-[state=active]:text-green-900 focus-visible:ring-ring">Tutor</TabsTrigger>
          <TabsTrigger value="files" className="data-[state=active]:bg-green-200 data-[state=active]:text-green-900 focus-visible:ring-ring">Tệp</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="mt-4">
          {isLoading ? (
            <div className="space-y-3">
              <div className="h-5 bg-muted rounded w-1/2" />
              <div className="h-4 bg-muted/60 rounded w-3/4" />
              <div className="h-4 bg-muted/60 rounded w-2/3" />
            </div>
          ) : error ? (
            <EmptyState title="Không tải được nội dung" description="Vui lòng thử lại sau." />
          ) : lesson ? (
            <div className="space-y-3">
              {pdfUrl && (
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Chế độ xem
                  </div>
                  <div className="inline-flex rounded-xl border border-border bg-background p-1">
                    <button
                      type="button"
                      onClick={() => setContentView("original")}
                      className={
                        contentView === "original"
                          ? "px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-100 text-green-900"
                          : "px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted/40"
                      }
                      aria-pressed={contentView === "original"}
                    >
                      Bản gốc
                    </button>
                    <button
                      type="button"
                      onClick={() => setContentView("text")}
                      className={
                        contentView === "text"
                          ? "px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-100 text-green-900"
                          : "px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted/40"
                      }
                      aria-pressed={contentView === "text"}
                    >
                      Văn bản
                    </button>
                  </div>
                </div>
              )}

              {pdfUrl && contentView === "original" ? (
                <div className="rounded-2xl border border-border bg-background overflow-hidden">
                  <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-border">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground truncate">Tài liệu gốc</div>
                      <div className="text-xs text-muted-foreground truncate">{pdfAttachment?.name}</div>
                    </div>
                    <a
                      href={pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 inline-flex items-center justify-center rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      Mở trong tab mới
                    </a>
                  </div>
                  <div className="w-full h-[72vh] bg-muted/40">
                    <iframe
                      title={pdfAttachment?.name || "PDF"}
                      src={pdfUrl}
                      className="w-full h-full"
                    />
                  </div>
                </div>
              ) : lesson.content ? (
                <div className="rounded-2xl border border-border bg-background p-4 sm:p-5">
                  <div className="text-xs text-muted-foreground mb-3">
                    Nếu nội dung bị mất định dạng, hãy kiểm tra phần "Bản gốc" (nếu có).
                  </div>
                  <article className="prose max-w-none prose-slate">
                    <pre className="whitespace-pre-wrap break-words text-foreground text-[15px] leading-7 bg-transparent p-0">{lesson.content}</pre>
                  </article>
                </div>
              ) : (
                <EmptyState title="Chưa có nội dung" description="Bài học này chưa có nội dung hiển thị." />
              )}
            </div>
          ) : (
            <EmptyState title="Chưa có nội dung" description="Bài học này chưa có nội dung hiển thị." />
          )}
        </TabsContent>

        <TabsContent value="tutor" className="mt-4">
          <LessonTutorChat classId={classId} lessonId={lessonId} />
        </TabsContent>

        <TabsContent value="files" className="mt-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-card/90 rounded-2xl border border-border p-4 sm:p-5 motion-safe:animate-pulse"
                >
                  <div className="h-4 bg-muted rounded w-2/3 mb-2" />
                  <div className="h-3 bg-muted/60 rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : lesson?.attachments && lesson.attachments.length > 0 ? (
            <div className="space-y-2" role="list">
              {lesson.attachments.map((file) => (
                <a
                  key={file.id}
                  href={getChatFileUrl(file.storagePath, "assignments")}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 p-3 rounded-2xl transition-colors border border-border bg-background hover:bg-green-50/40 hover:border-green-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <div className="h-10 w-10 rounded-xl bg-green-100 text-green-800 flex items-center justify-center text-[11px] font-extrabold shrink-0">
                    {(() => {
                      const mt = (file.mimeType || "").toLowerCase();
                      if (mt.includes("pdf")) return "PDF";
                      if (mt.includes("word") || mt.includes("doc")) return "DOC";
                      if (mt.includes("text")) return "TXT";
                      return "TỆP";
                    })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate text-foreground">{file.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{file.mimeType}</p>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <EmptyState title="Không có tệp đính kèm" description="Giáo viên chưa thêm tệp nào cho bài học này." />
          )}
        </TabsContent>
      </Tabs>

      {/* Prev/Next */}
      {lesson && (lesson.prevLessonId || lesson.nextLessonId) && (
        <div className="flex items-center justify-between pt-2 gap-3">
          <button
            type="button"
            disabled={!lesson.prevLessonId}
            onClick={() => lesson.prevLessonId && router.push(`/dashboard/student/classes/${classId}/lessons/${lesson.prevLessonId}`)}
            className="inline-flex items-center justify-center h-11 min-w-28 px-4 rounded-xl border border-border bg-background text-foreground text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Bài trước
          </button>
          <button
            type="button"
            disabled={!lesson.nextLessonId}
            onClick={() => lesson.nextLessonId && router.push(`/dashboard/student/classes/${classId}/lessons/${lesson.nextLessonId}`)}
            className="inline-flex items-center justify-center h-11 min-w-28 px-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Bài tiếp
          </button>
        </div>
      )}
    </div>
  );
}
