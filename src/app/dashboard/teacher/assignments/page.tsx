"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AssignmentList from "@/components/teacher/assignments/AssignmentList";
import AssignmentStats from "@/components/teacher/assignments/AssignmentStats";
import { useAssignments, type AssignmentT } from "@/hooks/use-assignments";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import Breadcrumb, { type BreadcrumbItem } from "@/components/ui/breadcrumb";
import { Plus, Search } from "lucide-react";

export default function AssignmentsPage() {
  const router = useRouter();
  const { assignments, loading, error, refresh } = useAssignments();
  const [status, setStatus] = useState<"all" | "active" | "completed" | "draft">("all");
  const [search, setSearch] = useState<string>("");
  // TODO: When class data is available in AssignmentT, wire this up
  const [clazz, setClazz] = useState<string>("all");

  const filteredAssignments = useMemo<AssignmentT[]>(() => {
    const now = new Date();
    return assignments.filter((a) => {
      const titleOk = a.title?.toLowerCase().includes(search.trim().toLowerCase());
      let statusOk = true;
      if (status !== "all") {
        const due = a.dueDate ? new Date(a.dueDate) : null;
        if (status === "active") statusOk = !!due && due >= now;
        else if (status === "completed") statusOk = !!due && due < now;
        else if (status === "draft") statusOk = false; // backend chưa hỗ trợ trạng thái nháp
      }
      // Class filter placeholder: no-op until assignment has class field
      const classOk = clazz === "all";
      return titleOk && statusOk && classOk;
    });
  }, [assignments, search, status, clazz]);

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "Dashboard", href: "/dashboard/teacher/dashboard" },
    { label: "Bài tập", href: "/dashboard/teacher/assignments" },
  ];

  return (
    <div className="px-6 py-4 max-w-6xl mx-auto space-y-6">
      <Breadcrumb items={breadcrumbItems} color="blue" className="mb-1" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800 mb-1">Quản lý bài tập</h1>
          <p className="text-sm sm:text-base text-gray-600">Tạo và quản lý bài tập cho học sinh của bạn.</p>
        </div>
        <Button
          onClick={() => {
            router.push("/dashboard/teacher/assignments/new");
          }}
          size="lg"
          className="flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Tạo bài tập mới</span>
        </Button>
      </div>

      {/* Stats Overview */}
      <AssignmentStats />

      {/* Filter & Search */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-xs lg:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-400" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm bài tập..."
            className="h-11 w-full pl-9"
            color="blue"
            aria-label="Tìm kiếm bài tập"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 justify-start md:justify-end">
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            color="blue"
            className="h-11 min-w-[170px] rounded-full border-2 bg-white shadow-sm hover:shadow-md"
            aria-label="Lọc theo trạng thái bài tập"
          >
            <option value="all">Tất cả bài tập</option>
            <option value="active">Đang diễn ra</option>
            <option value="completed">Đã kết thúc</option>
            <option value="draft">Bản nháp</option>
          </Select>
          <Select
            value={clazz}
            onChange={(e) => setClazz(e.target.value)}
            color="blue"
            className="h-11 min-w-[150px] rounded-full border-2 bg-white shadow-sm hover:shadow-md"
            aria-label="Lọc theo lớp học"
          >
            <option value="all">Tất cả lớp</option>
          </Select>
        </div>
      </div>

      {/* Assignment List */}
      <AssignmentList items={filteredAssignments} loading={loading} error={error} onRefresh={refresh} />
    </div>
  );
}
