"use client";

import { useRouter } from "next/navigation";
import { BookOpen, Users, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

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

  return (
    <div className="grid md:grid-cols-3 gap-6">

      {isLoading ? (
        Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl shadow-lg p-6 animate-pulse">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 bg-slate-100 rounded-xl" />
              <div className="h-6 w-24 bg-slate-100 rounded-full" />
            </div>
            <div className="h-6 bg-slate-100 rounded w-3/4 mb-2" />
            <div className="h-4 bg-slate-100 rounded w-1/2" />
          </div>
        ))
      ) : error ? (
        <div className="md:col-span-3 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
          <div className="font-semibold">Không thể tải danh sách khóa học</div>
          <div className="mt-1 text-sm">{error}</div>
          <Button className="mt-4" onClick={onRetry}>
            Thử lại
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="md:col-span-3 rounded-2xl border border-slate-200 bg-white p-6 text-slate-700">
          Chưa có khóa học nào. Hãy tạo khóa học mới để bắt đầu.
        </div>
      ) : (
        items.map((course) => {
          const lessons = course._count?.lessons ?? 0;
          const classrooms = course._count?.classrooms ?? 0;
          const ratio = lessons / maxLessons;
          const step = Math.min(
            progressWidthSteps.length - 1,
            Math.max(0, Math.round(ratio * (progressWidthSteps.length - 1)))
          );
          const widthClass = progressWidthSteps[step];
          return (
            <button
              key={course.id}
              type="button"
              onClick={() => handleCourseClick(course.id)}
              className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >

              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-sky-500 rounded-xl flex items-center justify-center text-white">
                  <BookOpen className="h-6 w-6" />
                </div>
                <div className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm font-medium">
                  {new Date(course.updatedAt).toLocaleDateString("vi-VN")}
                </div>
              </div>

              <h3 className="text-xl font-bold text-gray-800 mb-2">{course.title}</h3>

              <div className="flex items-center gap-4 text-gray-600 mb-4">
                <span className="text-sm inline-flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {classrooms} lớp
                </span>
                <span className="text-sm inline-flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {new Date(course.updatedAt).toLocaleDateString("vi-VN")}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Số bài học</span>
                  <span className="font-medium text-gray-800">{lessons}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r from-blue-500 to-sky-500 rounded-full transition-all duration-200 ${widthClass}`}
                  />
                </div>
              </div>
            </button>
          );
        })
      )}
    </div>
  );
}