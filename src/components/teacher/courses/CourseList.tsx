"use client";

import { useRouter } from "next/navigation";
import { BookOpen, Users, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

type CourseListItem = {
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

const progressWidthSteps = [
  "w-0",
  "w-1/6",
  "w-1/4",
  "w-1/3",
  "w-1/2",
  "w-2/3",
  "w-3/4",
  "w-5/6",
  "w-full",
] as const;

export default function CourseList({
  items,
  isLoading,
  error,
  onRetry,
}: {
  items: CourseListItem[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const router = useRouter();

  const handleCourseClick = (courseId: string) => {
    router.push(`/dashboard/teacher/courses/${courseId}`);
  };

  const maxLessons = items.reduce((acc, c) => Math.max(acc, c._count?.lessons ?? 0), 0) || 1;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl bg-white/95 border border-slate-100 shadow-[0_8px_24px_rgba(15,23,42,0.06)] px-5 py-4 sm:px-6 sm:py-5"
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <Skeleton className="h-14 w-14 rounded-2xl" />
              <Skeleton className="h-6 w-28 rounded-full" />
            </div>
            <Skeleton className="h-5 w-4/5 rounded" />
            <Skeleton className="mt-2 h-4 w-3/5 rounded" />
            <div className="mt-4 flex flex-wrap gap-2">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <Skeleton className="mt-4 h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Không thể tải danh sách khóa học</AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-4">
          <span>{error}</span>
          <Button variant="outline" onClick={onRetry}>
            Thử lại
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {items.map((course) => {
        const lessons = course._count?.lessons ?? 0;
        const classrooms = course._count?.classrooms ?? 0;
        const ratio = lessons / maxLessons;
        const step = Math.min(
          progressWidthSteps.length - 1,
          Math.max(0, Math.round(ratio * (progressWidthSteps.length - 1)))
        );
        const widthClass = progressWidthSteps[step];
        return (
          <article
            key={course.id}
            onClick={() => handleCourseClick(course.id)}
            onKeyDown={(e) => {
              if (e.currentTarget !== e.target) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleCourseClick(course.id);
              }
            }}
            className="flex flex-col justify-between rounded-2xl bg-white/95 border border-slate-100 shadow-[0_8px_24px_rgba(15,23,42,0.06)] px-5 py-4 sm:px-6 sm:py-5 transition-all duration-200 ease-out cursor-pointer hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(15,23,42,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            role="button"
            tabIndex={0}
            aria-label={`Mở khóa học ${course.title}`}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-blue-500 to-indigo-400 text-white shadow-sm">
                  <BookOpen className="h-6 w-6" />
                </div>
                <div className="space-y-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 line-clamp-2">
                    {course.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 line-clamp-2">
                    {course.description || "Không có mô tả"}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-700 border border-blue-100 whitespace-nowrap">
                {new Date(course.updatedAt).toLocaleDateString("vi-VN")}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] sm:text-xs">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 font-medium text-slate-700 border border-slate-200">
                <Users className="h-4 w-4" />
                {classrooms} lớp
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 font-medium text-slate-700 border border-slate-200">
                <Layers className="h-4 w-4" />
                {lessons} bài học
              </span>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-600">
                <span className="font-medium">Tiến độ nội dung</span>
                <span className="font-semibold text-blue-700">{lessons}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-200 ${widthClass}`} />
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}