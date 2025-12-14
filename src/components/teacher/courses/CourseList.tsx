"use client";

import useSWR from "swr";
import { useRouter } from "next/navigation";
import { BookOpen, Users, Clock } from "lucide-react";

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

type ApiResponse = {
  success?: boolean;
  data?: {
    items?: CourseListItem[];
  };
  message?: string;
};

const fetcher = (url: string) =>
  fetch(url).then(async (r) => {
    const json = await r.json().catch(() => ({}));
    if (!r.ok || json?.success === false) {
      throw new Error(json?.message || "fetch error");
    }
    return json as ApiResponse;
  });

export default function CourseList() {
  const router = useRouter();

  const { data, error, isLoading } = useSWR<ApiResponse>("/api/teachers/courses?take=200", fetcher, {
    revalidateOnFocus: true,
    shouldRetryOnError: false,
  });

  const courses = data?.data?.items ?? [];

  const handleCourseClick = (courseId: string) => {
    router.push(`/dashboard/teacher/courses/${courseId}`);
  };

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
          Không thể tải danh sách khóa học. Vui lòng thử lại.
        </div>
      ) : courses.length === 0 ? (
        <div className="md:col-span-3 rounded-2xl border border-slate-200 bg-white p-6 text-slate-700">
          Chưa có khóa học nào. Hãy tạo khóa học mới để bắt đầu.
        </div>
      ) : (
        courses.map((course) => (
          <div
            key={course.id}
            onClick={() => handleCourseClick(course.id)}
            className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-sky-500 rounded-xl flex items-center justify-center text-white">
                <BookOpen className="h-6 w-6" />
              </div>
              <div className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-sm font-medium">
                Đang diễn ra
              </div>
            </div>

            <h3 className="text-xl font-bold text-gray-800 mb-2">{course.title}</h3>

            <div className="flex items-center gap-4 text-gray-600 mb-4">
              <span className="text-sm inline-flex items-center gap-1">
                <Users className="h-4 w-4" />
                {course._count?.classrooms ?? 0} lớp
              </span>
              <span className="text-sm inline-flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {new Date(course.updatedAt).toLocaleDateString("vi-VN")}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Số bài học</span>
                <span className="font-medium text-gray-800">{course._count?.lessons ?? 0}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-sky-500 rounded-full" style={{ width: "40%" }} />
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}