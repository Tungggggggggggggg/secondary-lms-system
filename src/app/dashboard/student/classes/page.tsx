"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useClassroom } from "@/hooks/use-classroom";
import { ClassroomResponse } from "@/types/classroom";
import Breadcrumb, { BreadcrumbItem } from "@/components/ui/breadcrumb";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import ClassesToolbar from "@/components/student/ClassesToolbar";
import ClassList from "@/components/student/ClassList";
import ClassGridSkeleton from "@/components/student/ClassGridSkeleton";
import { AlertCircle, Plus, BookOpen } from "lucide-react";

type SortOption = "newest" | "oldest" | "name" | "students";
type ViewMode = "grid" | "list";

export default function ClassesPage() {
  const router = useRouter();
  const { classrooms, isLoading, error, fetchClassrooms } = useClassroom();
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState<ViewMode>("grid");

  useEffect(() => {
    fetchClassrooms();
  }, [fetchClassrooms]);

  // Filter và sort classrooms
  const filteredAndSortedClassrooms = useMemo(() => {
    if (!classrooms) return [];

    let filtered = [...classrooms];

    // Filter theo search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.code.toLowerCase().includes(query) ||
          c.teacher?.fullname?.toLowerCase().includes(query) ||
          c.description?.toLowerCase().includes(query)
      );
    }

    // Sort
    switch (sortBy) {
      case "name":
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "students":
        filtered.sort(
          (a, b) => (b._count?.students ?? 0) - (a._count?.students ?? 0)
        );
        break;
      case "oldest":
        filtered.sort(
          (a, b) =>
            new Date(a.joinedAt || a.createdAt).getTime() -
            new Date(b.joinedAt || b.createdAt).getTime()
        );
        break;
      case "newest":
      default:
        filtered.sort(
          (a, b) =>
            new Date(b.joinedAt || b.createdAt).getTime() -
            new Date(a.joinedAt || a.createdAt).getTime()
        );
        break;
    }

    return filtered;
  }, [classrooms, sortBy, searchQuery]);

  // Breadcrumb items
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "Dashboard", href: "/dashboard/student/dashboard" },
    { label: "Lớp học", href: "/dashboard/student/classes" },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb items={breadcrumbItems} color="green" />

      {/* Page Header */}
      <PageHeader
        title="Lớp học của tôi"
        subtitle="Các lớp học bạn đã tham gia"
        role="student"
      />

      {/* Error State */}
      {error && (
        <Alert variant="destructive" className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-900">Lỗi tải dữ liệu</AlertTitle>
          <AlertDescription className="text-red-700">
            {error}. Vui lòng thử lại hoặc liên hệ hỗ trợ.
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <>
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="flex-1 h-10 bg-gray-200 rounded-xl motion-safe:animate-pulse" />
            <div className="w-32 h-10 bg-gray-200 rounded-xl motion-safe:animate-pulse" />
            <div className="w-24 h-10 bg-gray-200 rounded-xl motion-safe:animate-pulse" />
          </div>
          <ClassGridSkeleton count={6} variant={view} />
        </>
      )}

      {/* Content */}
      {!isLoading && !error && (
        <>
          {/* Toolbar */}
          <ClassesToolbar
            query={searchQuery}
            onQueryChange={setSearchQuery}
            sortBy={sortBy}
            onSortChange={setSortBy}
            view={view}
            onViewChange={setView}
          />

          {/* CTA Button */}
          <div className="flex justify-end">
            <Button
              onClick={() => router.push("/dashboard/student/classes/join")}
              color="green"
              size="lg"
              className="gap-2"
            >
              <Plus className="h-5 w-5" />
              <span>Tham gia lớp mới</span>
            </Button>
          </div>

          {/* List/Grid */}
          {filteredAndSortedClassrooms.length > 0 ? (
            <ClassList items={filteredAndSortedClassrooms} variant={view} />
          ) : (
            <EmptyState
              variant="student"
              icon={<BookOpen className="h-12 w-12 text-green-600" />}
              title={
                classrooms && classrooms.length > 0
                  ? "Không tìm thấy lớp học"
                  : "Chưa có lớp học nào"
              }
              description={
                classrooms && classrooms.length > 0
                  ? "Thử điều chỉnh bộ lọc hoặc tìm kiếm lại."
                  : "Hãy tham gia lớp học đầu tiên để bắt đầu."
              }
              action={
                (!classrooms || classrooms.length === 0) && (
                  <Button
                    onClick={() => router.push("/dashboard/student/classes/join")}
                    color="green"
                    size="lg"
                    className="gap-2"
                  >
                    <Plus className="h-5 w-5" />
                    <span>Tham gia lớp học đầu tiên</span>
                  </Button>
                )
              }
            />
          )}
        </>
      )}
    </div>
  );
}
