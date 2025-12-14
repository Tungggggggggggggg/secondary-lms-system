"use client";

import useSWR from "swr";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BookOpen, ChevronRight } from "lucide-react";

import { EmptyState, SectionHeader } from "@/components/shared";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type LessonListItem = {
  id: string;
  title: string;
  order: number;
  courseId: string;
  courseTitle: string;
  publishedAt: string;
};

type ApiResponse = {
  success?: boolean;
  data?: {
    items?: LessonListItem[];
  };
  message?: string;
};

export default function StudentClassroomLessonsPage() {
  const params = useParams();
  const classId = params.classId as string;

  const { data, error, isLoading } = useSWR<ApiResponse>(
    classId ? `/api/students/classes/${classId}/lessons?limit=200` : null,
    fetcher
  );

  const items = data?.data?.items ?? [];

  return (
    <div className="space-y-6">
      <SectionHeader title={<span className="text-green-700">Bài học</span>} />

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white/90 rounded-2xl border border-slate-100 p-4 sm:p-5 motion-safe:animate-pulse"
            >
              <div className="h-4 bg-slate-200 rounded w-1/2 mb-2" />
              <div className="h-3 bg-slate-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700">
          Không tải được danh sách bài học. Vui lòng thử lại sau.
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-12 w-12 text-green-600" />}
          title="Chưa có bài học"
          description="Giáo viên chưa thêm bài học nào cho lớp này hoặc chưa gán khóa học."
        />
      ) : (
        <div className="space-y-3" role="list">
          {items.map((l) => (
            <Link
              key={l.id}
              href={`/dashboard/student/classes/${classId}/lessons/${l.id}`}
              className="group block"
            >
              <div className="bg-white/90 rounded-2xl border border-slate-100 p-4 sm:p-5 hover:border-green-200 hover:bg-green-50/30 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 h-9 w-9 rounded-xl bg-green-100 text-green-700 flex items-center justify-center">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{l.title}</p>
                        <p className="text-xs text-slate-600 truncate">
                          {l.courseTitle} • Bài {l.order}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-green-700 transition-colors" />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Phát hành: {new Date(l.publishedAt).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
