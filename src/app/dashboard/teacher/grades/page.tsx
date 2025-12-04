"use client";

import GradesList from "@/components/teacher/grades/GradesList";
import GradesStats from "@/components/teacher/grades/GradesStats";
import { Select } from "@/components/ui/select";    
import { Input } from "@/components/ui/input";
import Breadcrumb, { type BreadcrumbItem } from "@/components/ui/breadcrumb";
import PageHeader from "@/components/shared/PageHeader";
import { useState } from "react";

export default function GradesPage() {
  const [search, setSearch] = useState<string>("");
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "Dashboard", href: "/dashboard/teacher/dashboard" },
    { label: "Bảng điểm", href: "/dashboard/teacher/grades" },
  ];
  return (
    <div className="px-6 py-4 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <Breadcrumb items={breadcrumbItems} color="blue" className="mb-1" />
      <PageHeader
        title="Quản lý điểm số"
        subtitle="Theo dõi và đánh giá kết quả học tập"
        role="teacher"
        badge={
          <span className="inline-flex items-center rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm">
            <span className="mr-1" aria-hidden="true">📊</span>
            <span>Bảng điểm</span>
          </span>
        }
      />

      {/* Stats Overview */}
      <GradesStats />

      {/* Filter & Search */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-xs lg:max-w-sm">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 text-sm">
            🔍
          </span>
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm lớp học..."
            className="h-11 w-full pl-9"
            color="blue"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 justify-start md:justify-end">
          <Select
            color="blue"
            className="h-11 min-w-[160px]"
          >
            <option value="all">Tất cả môn học</option>
            <option value="history">Lịch sử</option>
            <option value="geography">Địa lý</option>
            <option value="english">Tiếng Anh</option>
          </Select>
          <Select
            color="blue"
            className="h-11 min-w-[140px]"
          >
            <option value="all">Tất cả lớp</option>
            <option value="8a1">Lớp 8A1</option>
            <option value="9b2">Lớp 9B2</option>
            <option value="7c">Lớp 7C</option>
          </Select>
          <Select
            color="blue"
            className="h-11 min-w-[170px]"
          >
            <option value="latest">Mới nhất</option>
            <option value="highest">Điểm cao nhất</option>
            <option value="lowest">Điểm thấp nhất</option>
          </Select>
        </div>
      </div>

      {/* Grades List */}
      <GradesList search={search} />
    </div>
  );
}
