// src/app/student/grades/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Breadcrumb, { BreadcrumbItem } from "@/components/ui/breadcrumb";
import { useStudentGrades, GradeEntry } from "@/hooks/use-student-grades";
import { Button } from "@/components/ui/button";

/**
 * Trang điểm số của tôi (student view - tất cả classrooms)
 */
export default function GradesPage() {
  const { grades, statistics, isLoading, error, fetchAllGrades } = useStudentGrades();
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "grade" | "classroom">("newest");
  const [searchQuery, setSearchQuery] = useState("");

  // Load grades khi component mount
  useEffect(() => {
    fetchAllGrades();
  }, [fetchAllGrades]);

  // Filter và sort grades
  const filteredAndSortedGrades = useMemo(() => {
    let filtered = [...grades];

    // Filter theo search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (g) =>
          g.assignmentTitle.toLowerCase().includes(query) ||
          g.classroom?.name.toLowerCase().includes(query) ||
          g.feedback?.toLowerCase().includes(query)
      );
    }

    // Sort
    switch (sortBy) {
      case "oldest":
        filtered.sort((a, b) => 
          new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
        );
        break;
      case "grade":
        filtered.sort((a, b) => {
          const gradeA = a.grade ?? 0;
          const gradeB = b.grade ?? 0;
          return gradeB - gradeA; // Điểm cao nhất trước
        });
        break;
      case "classroom":
        filtered.sort((a, b) => {
          const nameA = a.classroom?.name || "";
          const nameB = b.classroom?.name || "";
          return nameA.localeCompare(nameB);
        });
        break;
      case "newest":
      default:
        filtered.sort((a, b) => 
          new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
        );
        break;
    }

    return filtered;
  }, [grades, sortBy, searchQuery]);

  // Breadcrumb items
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "Dashboard", href: "/dashboard/student/dashboard" },
    { label: "Điểm số", href: "/dashboard/student/grades" },
  ];

  if (error) {
    return (
      <div className="p-6">
        <Breadcrumb items={breadcrumbItems} className="mb-4" />
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">
          <h3 className="font-semibold mb-2">Lỗi tải danh sách điểm số</h3>
          <p className="text-sm mb-4">{error}</p>
          <Button onClick={fetchAllGrades}>Thử lại</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Breadcrumb items={breadcrumbItems} className="mb-4" />
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Điểm số của tôi</h1>
        <div className="flex items-center gap-6">
          <div className="text-lg">
            Điểm trung bình:{" "}
            <span className="font-bold text-green-600">
              {statistics.averageGrade > 0 ? statistics.averageGrade.toFixed(1) : "N/A"}
            </span>
          </div>
          {statistics.totalGraded !== undefined && (
            <div className="text-sm text-gray-600">
              Đã chấm: <span className="font-medium">{statistics.totalGraded}</span> bài
            </div>
          )}
        </div>
      </div>

      {/* Filter và Search */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <select
          value={sortBy}
          onChange={(e) =>
            setSortBy(
              e.target.value as "newest" | "oldest" | "grade" | "classroom"
            )
          }
          className="px-4 py-2 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="newest">Mới nhất</option>
          <option value="oldest">Cũ nhất</option>
          <option value="grade">Điểm cao nhất</option>
          <option value="classroom">Theo lớp học</option>
        </select>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm kiếm bài tập hoặc lớp học..."
          className="flex-1 px-4 py-2 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Grades Table */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500 animate-pulse">
          Đang tải danh sách điểm số...
        </div>
      ) : filteredAndSortedGrades.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
          <div className="text-5xl mb-4">📊</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            Chưa có điểm số nào
          </h3>
          <p className="text-gray-600">
            {grades.length === 0
              ? "Bạn chưa có bài nộp nào được chấm điểm"
              : "Không tìm thấy điểm số nào phù hợp với bộ lọc"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lớp học</TableHead>
                <TableHead>Bài tập</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Điểm</TableHead>
                <TableHead>Nhận xét</TableHead>
                <TableHead>Ngày nộp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedGrades.map((grade) => (
                <TableRow key={grade.id}>
                  <TableCell>
                    {grade.classroom ? (
                      <div className="flex items-center gap-2">
                        <span>{grade.classroom.icon}</span>
                        <span className="font-medium">{grade.classroom.name}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">N/A</span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {grade.assignmentTitle}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${
                        grade.assignmentType === "ESSAY"
                          ? "bg-indigo-50 text-indigo-700"
                          : "bg-pink-50 text-pink-700"
                      }`}
                    >
                      {grade.assignmentType === "ESSAY" ? "📝 Tự luận" : "❓ Trắc nghiệm"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {grade.grade !== null ? (
                      <span className="font-bold text-green-600">
                        {grade.grade.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-gray-400">Chưa chấm</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {grade.feedback ? (
                      <span className="text-sm text-gray-700">{grade.feedback}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {new Date(grade.submittedAt).toLocaleDateString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}