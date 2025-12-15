"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import CourseList from "@/components/teacher/courses/CourseList";
import CourseStats from "@/components/teacher/courses/CourseStats";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";

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

const fetcher = async (url: string): Promise<ApiResponse> => {
  const res = await fetch(url, { cache: "no-store" });
  const json = (await res.json().catch(() => ({}))) as ApiResponse;
  if (!res.ok || json?.success === false) {
    throw new Error(json?.message || "Không thể tải danh sách khóa học");
  }
  return json;
};

export default function CoursesPage() {
  const router = useRouter();
  const [search, setSearch] = useState<string>("");
  const [sortKey, setSortKey] = useState<"recent" | "oldest" | "name" | "classrooms">("recent");

  const { data, error, isLoading, mutate } = useSWR<ApiResponse>(
    "/api/teachers/courses?take=200",
    fetcher,
    {
      revalidateOnFocus: true,
      shouldRetryOnError: false,
    }
  );

  const courses = data?.data?.items ?? [];

  const errorMessage = error instanceof Error ? error.message : error ? String(error) : null;

  const visibleCourses = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? courses.filter((c) => {
          const title = c.title.toLowerCase();
          const description = (c.description || "").toLowerCase();
          return title.includes(q) || description.includes(q);
        })
      : courses;

    const sorted = [...filtered];
    if (sortKey === "name") {
      sorted.sort((a, b) => a.title.localeCompare(b.title, "vi"));
    } else if (sortKey === "oldest") {
      sorted.sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
    } else if (sortKey === "classrooms") {
      const count = (x: CourseListItem) => x._count?.classrooms ?? 0;
      sorted.sort((a, b) => count(b) - count(a));
    } else {
      sorted.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }
    return sorted;
  }, [courses, search, sortKey]);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-800 mb-2">Khóa học của tôi</h1>
          <p className="text-gray-600">Quản lý và theo dõi tất cả khóa học của bạn</p>
        </div>
        <Button
          onClick={() => {
            router.push("/dashboard/teacher/courses/new");
          }}
          size="lg"
          className="flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          <span>Tạo khóa học mới</span>
        </Button>
      </div>

      {/* Stats Overview */}
      <CourseStats courses={courses} isLoading={isLoading} />

      {/* Filter & Search (có thể thêm sau) */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Select
            value={sortKey}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "recent" || v === "oldest" || v === "name" || v === "classrooms") {
                setSortKey(v);
              }
            }}
          >
            <option value="recent">Gần đây nhất</option>
            <option value="oldest">Cũ nhất</option>
            <option value="name">Theo tên</option>
            <option value="classrooms">Số lớp sử dụng</option>
          </Select>
        </div>
        <div className="relative">
          <Input
            type="text"
            placeholder="Tìm kiếm khóa học..."
            aria-label="Tìm kiếm khóa học"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 bg-white rounded-xl border border-gray-200 w-64"
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-slate-500" />
        </div>
      </div>

      {/* Course List */}
      <CourseList items={visibleCourses} isLoading={isLoading} error={errorMessage} onRetry={() => mutate()} />
    </div>
  );
}
