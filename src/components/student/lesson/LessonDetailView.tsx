"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { PageHeader } from "@/components/shared";
import { EmptyState } from "@/components/shared";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getChatFileUrl } from "@/lib/supabase-upload";
import { FileText, Link as LinkIcon, File, CheckCircle2, ArrowLeft, ArrowRight, User } from "lucide-react";
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
        badge={
          <button
            type="button"
            onClick={toggleDone}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
              done ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
            aria-pressed={done}
          >
            <CheckCircle2 className={`h-4 w-4 ${done ? "text-emerald-600" : "text-slate-500"}`} />
            {done ? "Đã hoàn thành" : "Đánh dấu đã học"}
          </button>
        }
      />

      {/* Meta */}
      {lesson && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 flex flex-wrap items-center gap-4 text-sm">
          {lesson.teacher?.fullname && (
            <div className="inline-flex items-center gap-2 text-slate-700">
              <User className="h-4 w-4 text-green-600" />
              <span className="font-medium">{lesson.teacher.fullname}</span>
            </div>
          )}
          {lesson.publishedAt && (
            <div className="inline-flex items-center gap-2 text-slate-600">
              <FileText className="h-4 w-4 text-slate-500" />
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
          <TabsTrigger value="content" className="data-[state=active]:bg-green-200 data-[state=active]:text-green-900 focus-visible:ring-green-500">Nội dung</TabsTrigger>
          <TabsTrigger value="files" className="data-[state=active]:bg-green-200 data-[state=active]:text-green-900 focus-visible:ring-green-500">Tệp</TabsTrigger>
          <TabsTrigger value="links" className="data-[state=active]:bg-green-200 data-[state=active]:text-green-900 focus-visible:ring-green-500">Liên kết</TabsTrigger>
          <TabsTrigger value="notes" className="data-[state=active]:bg-green-200 data-[state=active]:text-green-900 focus-visible:ring-green-500">Ghi chú</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="mt-4">
          {isLoading ? (
            <div className="space-y-3">
              <div className="h-5 bg-slate-200 rounded w-1/2" />
              <div className="h-4 bg-slate-100 rounded w-3/4" />
              <div className="h-4 bg-slate-100 rounded w-2/3" />
            </div>
          ) : error ? (
            <EmptyState title="Không tải được nội dung" description="Vui lòng thử lại sau." icon={<FileText className="h-12 w-12 text-rose-500" />} />
          ) : lesson?.content ? (
            <article className="prose max-w-none prose-slate">
              <pre className="whitespace-pre-wrap break-words text-slate-800 text-[15px] leading-7 bg-transparent p-0">{lesson.content}</pre>
            </article>
          ) : (
            <EmptyState title="Chưa có nội dung" description="Bài học này chưa có nội dung hiển thị." icon={<FileText className="h-12 w-12 text-slate-400" />} />
          )}
        </TabsContent>

        <TabsContent value="files" className="mt-4">
          {isLoading ? (
            <p className="text-sm text-slate-600">Đang tải...</p>
          ) : lesson?.attachments && lesson.attachments.length > 0 ? (
            <div className="space-y-2">
              {lesson.attachments.map((file) => (
                <a key={file.id} href={getChatFileUrl(file.storagePath)} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-2 rounded-lg transition-colors border border-transparent hover:bg-green-100/40 hover:border-green-200">
                  <File className="h-5 w-5 text-green-600" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-slate-900">{file.name}</p>
                    <p className="text-xs text-slate-500 truncate">{file.mimeType}</p>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <EmptyState title="Không có tệp đính kèm" description="Giáo viên chưa thêm tệp nào cho bài học này." icon={<File className="h-12 w-12 text-green-600" />} />
          )}
        </TabsContent>

        <TabsContent value="links" className="mt-4">
          {isLoading ? (
            <p className="text-sm text-slate-600">Đang tải...</p>
          ) : lesson?.links && lesson.links.length > 0 ? (
            <div className="space-y-2">
              {lesson.links.map((lnk, i) => (
                <a key={i} href={lnk.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-2 rounded-lg transition-colors border border-transparent hover:bg-green-100/40 hover:border-green-200">
                  <LinkIcon className="h-5 w-5 text-green-600" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-green-700">{lnk.url}</p>
                    <p className="text-xs text-slate-500 truncate">{new Date(lnk.createdAt).toLocaleDateString("vi-VN")}</p>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <EmptyState title="Không có liên kết" description="Bài học này chưa có liên kết tham khảo." icon={<LinkIcon className="h-12 w-12 text-green-600" />} />
          )}
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <LessonNotes lessonId={lessonId} />
        </TabsContent>
      </Tabs>

      {/* Prev/Next */}
      {lesson && (lesson.prevLessonId || lesson.nextLessonId) && (
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            disabled={!lesson.prevLessonId}
            onClick={() => lesson.prevLessonId && router.push(`/dashboard/student/classes/${classId}/lessons/${lesson.prevLessonId}`)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-50 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Bài trước
          </button>
          <button
            type="button"
            disabled={!lesson.nextLessonId}
            onClick={() => lesson.nextLessonId && router.push(`/dashboard/student/classes/${classId}/lessons/${lesson.nextLessonId}`)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-50 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
          >
            Bài tiếp
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function LessonNotes({ lessonId }: { lessonId: string }) {
  const key = `lesson:notes:${lessonId}`;
  const [value, setValue] = useState("");
  useEffect(() => {
    try {
      const v = localStorage.getItem(key);
      setValue(v || "");
    } catch {}
  }, [key]);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5">
      <label htmlFor="lesson-notes" className="block text-sm font-semibold text-slate-800 mb-2">Ghi chú của bạn</label>
      <textarea
        id="lesson-notes"
        className="w-full min-h-[140px] rounded-xl border-2 border-green-300 bg-green-50/50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500"
        placeholder="Ghi lại những ý chính, câu hỏi hoặc link tham khảo..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          try { localStorage.setItem(key, value); } catch {}
        }}
      />
      <p className="text-xs text-slate-500 mt-2">Ghi chú được lưu trên trình duyệt của bạn.</p>
    </div>
  );
}
