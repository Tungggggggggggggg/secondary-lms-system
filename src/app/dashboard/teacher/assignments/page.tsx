"use client";

import { useMemo, useState } from "react";
import AssignmentList from "@/components/teacher/assignments/AssignmentList";
import AssignmentStats from "@/components/teacher/assignments/AssignmentStats";
import { useAssignments, type AssignmentT } from "@/hooks/use-assignments";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export default function AssignmentsPage() {
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

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-800 mb-2">Quản lý bài tập</h1>
          <p className="text-gray-600">Tạo và quản lý bài tập cho học sinh của bạn</p>
        </div>
        <Button
          onClick={() => {
            window.location.href = "/dashboard/teacher/assignments/new";
          }}
          size="lg"
          className="flex items-center gap-2"
        >
          <span>➕</span>
          <span>Tạo bài tập mới</span>
        </Button>
      </div>

      {/* Stats Overview */}
      <AssignmentStats />

      {/* Filter & Search */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            <option value="all">Tất cả bài tập</option>
            <option value="active">Đang diễn ra</option>
            <option value="completed">Đã kết thúc</option>
            <option value="draft">Bản nháp</option>
          </Select>
          <Select value={clazz} onChange={(e) => setClazz(e.target.value)}>
            <option value="all">Tất cả lớp</option>
          </Select>
        </div>
        <div className="relative">
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm bài tập..."
            className="pl-10 pr-4 py-2 bg-white rounded-xl border border-gray-200 w-64"
          />
          <span className="absolute left-3 top-2.5">🔍</span>
        </div>
      </div>

      {/* Assignment List */}
      <AssignmentList items={filteredAssignments} loading={loading} error={error} onRefresh={refresh} />
    </div>
  );
}
