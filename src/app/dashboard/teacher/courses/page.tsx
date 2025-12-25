"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import CourseList from "@/components/teacher/courses/CourseList";
import CourseStats from "@/components/teacher/courses/CourseStats";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import Breadcrumb, { type BreadcrumbItem } from "@/components/ui/breadcrumb";
import { EmptyState, FilterBar, PageHeader } from "@/components/shared";
import { BookOpen, Plus, Search } from "lucide-react";

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

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "Dashboard", href: "/dashboard/teacher/dashboard" },
    { label: "Khóa học", href: "/dashboard/teacher/courses" },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb items={breadcrumbItems} color="blue" className="mb-2" />

      <PageHeader
        title="Khóa học của tôi"
        subtitle="Quản lý và theo dõi tất cả khóa học của bạn"
        role="teacher"
      />

      <div className="flex justify-end">
        <Button
          type="button"
          color="blue"
          variant="primary"
          onClick={() => {
            router.push("/dashboard/teacher/courses/new");
          }}
          className="inline-flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Tạo khóa học mới
        </Button>
      </div>

      {/* Stats Overview */}
      <CourseStats courses={courses} isLoading={isLoading} />

      {/* Filter & Search (có thể thêm sau) */}
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        color="blue"
        placeholder="Tìm kiếm khóa học..."
        right={
          <Select
            value={sortKey}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "recent" || v === "oldest" || v === "name" || v === "classrooms") {
                setSortKey(v);
              }
            }}
            color="blue"
            className="h-11 min-w-[180px]"
            aria-label="Sắp xếp khóa học"
          >
            <option value="recent">Gần đây nhất</option>
            <option value="oldest">Cũ nhất</option>
            <option value="name">Theo tên</option>
            <option value="classrooms">Số lớp sử dụng</option>
          </Select>
        }
        onReset={() => {
          setSearch("");
          setSortKey("recent");
        }}
      />

      {/* Course List */}
      {!isLoading && !errorMessage && courses.length === 0 ? (
        <EmptyState
          variant="teacher"
          icon={<BookOpen className="h-12 w-12 text-blue-600" />}
          title="Bạn chưa có khóa học nào"
          description="Bắt đầu bằng việc tạo khóa học đầu tiên để thêm bài học và giao bài tập."
          action={
            <Button
              type="button"
              color="blue"
              onClick={() => router.push("/dashboard/teacher/courses/new")}
            >
              Tạo khóa học đầu tiên
            </Button>
          }
        />
      ) : !isLoading && !errorMessage && courses.length > 0 && visibleCourses.length === 0 ? (
        <EmptyState
          variant="teacher"
          icon={<Search className="h-12 w-12 text-blue-600" />}
          title="Không tìm thấy khóa học nào phù hợp với bộ lọc"
          description="Hãy thử đổi từ khóa tìm kiếm hoặc đặt lại sắp xếp."
          action={
            <Button
              type="button"
              variant="outline"
              color="blue"
              onClick={() => {
                setSearch("");
                setSortKey("recent");
              }}
            >
              Đặt lại bộ lọc
            </Button>
          }
        />
      ) : (
        <CourseList items={visibleCourses} isLoading={isLoading} error={errorMessage} onRetry={() => mutate()} />
      )}
    </div>
  );
}
