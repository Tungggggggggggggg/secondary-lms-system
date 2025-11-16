"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useStudentGrades, GradeEntry } from "@/hooks/use-student-grades";
import { Button } from "@/components/ui/button";

/**
 * Trang điểm số của lớp học (student view)
 */
export default function StudentClassroomGradesPage() {
  const params = useParams();
  const classId = params.classId as string;

  const { grades, statistics, isLoading, error, fetchClassroomGrades } =
    useStudentGrades();

  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "grade">("newest");

  // Load grades khi component mount
  useEffect(() => {
    if (classId) {
      fetchClassroomGrades(classId);
    }
  }, [classId, fetchClassroomGrades]);

  // Sort grades
  const sortedGrades = useMemo(() => {
    let sorted = [...grades];

    switch (sortBy) {
      case "oldest":
        sorted.sort((a, b) => {
          const timeA = a.submittedAt
            ? new Date(a.submittedAt).getTime()
            : 0;
          const timeB = b.submittedAt
            ? new Date(b.submittedAt).getTime()
            : 0;
          return timeA - timeB;
        });
        break;
      case "grade":
        sorted.sort((a, b) => {
          const gradeA = a.grade ?? 0;
          const gradeB = b.grade ?? 0;
          return gradeB - gradeA; // Điểm cao nhất trước
        });
        break;
      case "newest":
      default:
        sorted.sort((a, b) => {
          const timeA = a.submittedAt
            ? new Date(a.submittedAt).getTime()
            : 0;
          const timeB = b.submittedAt
            ? new Date(b.submittedAt).getTime()
            : 0;
          return timeB - timeA;
        });
        break;
    }

    return sorted;
  }, [grades, sortBy]);

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">
        <h3 className="font-semibold mb-2">Lỗi tải danh sách điểm số</h3>
        <p className="text-sm mb-4">{error}</p>
        <Button onClick={() => fetchClassroomGrades(classId)}>Thử lại</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Điểm số của lớp</h2>
          <p className="text-gray-600">
            Điểm số các bài tập bạn đã nộp trong lớp học này
          </p>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 shadow border border-gray-100">
          <div className="text-sm text-gray-600 mb-1">Điểm trung bình</div>
          <div className="text-2xl font-bold text-green-600">
            {statistics.averageGrade > 0
              ? statistics.averageGrade.toFixed(1)
              : "N/A"}
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow border border-gray-100">
          <div className="text-sm text-gray-600 mb-1">Đã chấm</div>
          <div className="text-2xl font-bold text-blue-600">
            {statistics.totalGraded ?? 0}
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow border border-gray-100">
          <div className="text-sm text-gray-600 mb-1">Chưa chấm</div>
          <div className="text-2xl font-bold text-orange-600">
            {statistics.totalPending ?? 0}
          </div>
        </div>
      </div>

      {/* Sort */}
      <div className="flex items-center justify-end">
        <select
          value={sortBy}
          onChange={(e) =>
            setSortBy(e.target.value as "newest" | "oldest" | "grade")
          }
          className="px-4 py-2 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="newest">Mới nhất</option>
          <option value="oldest">Cũ nhất</option>
          <option value="grade">Điểm cao nhất</option>
        </select>
      </div>

      {/* Grades Table */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500 animate-pulse">
          Đang tải danh sách điểm số...
        </div>
      ) : sortedGrades.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
          <div className="text-5xl mb-4">📊</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            Chưa có điểm số nào
          </h3>
          <p className="text-gray-600">
            Bạn chưa nộp bài tập nào trong lớp học này
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bài tập</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Hạn nộp</TableHead>
                <TableHead>Ngày nộp</TableHead>
                <TableHead>Điểm</TableHead>
                <TableHead>Nhận xét</TableHead>
                <TableHead>Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedGrades.map((grade) => (
                <TableRow key={grade.id}>
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
                  <TableCell className="text-sm text-gray-600">
                    {grade.dueDate
                      ? new Date(grade.dueDate).toLocaleDateString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })
                      : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {grade.submittedAt
                      ? new Date(grade.submittedAt).toLocaleDateString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })
                      : "Chưa nộp"}
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
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${
                        grade.status === "graded"
                          ? "bg-green-100 text-green-700"
                          : grade.status === "submitted"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {grade.status === "graded"
                        ? "✓ Đã chấm"
                        : grade.status === "submitted"
                        ? "📝 Đã nộp"
                        : "⏳ Chờ chấm"}
                    </span>
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