"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useStudentGrades, GradeEntry } from "@/hooks/use-student-grades";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Award, CheckCircle2, Clock, ChevronDown, MessageCircle, AlertCircle, BarChart3 } from "lucide-react";
import { SectionHeader } from "@/components/shared";
import { StatsGrid, type StatItem } from "@/components/shared";
import GradeStatusBadge from "@/components/student/grades/GradeStatusBadge";
import AssignmentTypeBadge from "@/components/student/AssignmentTypeBadge";

/**
 * Trang điểm số của lớp học (student view)
 */
export default function StudentClassroomGradesPage() {
  const params = useParams();
  const classId = params.classId as string;

  const { grades, statistics, isLoading, error, fetchClassroomGrades } =
    useStudentGrades();

  const [sortBy, setSortBy] = useState<
    "newest" | "grade_desc" | "grade_asc" | "due_date"
  >("newest");
  const [statusFilter, setStatusFilter] = useState<"all" | "graded" | "submitted" | "pending">("all");

  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<
    { assignmentTitle: string; feedback: string } | null
  >(null);

  // Load grades khi component mount
  useEffect(() => {
    if (classId) {
      fetchClassroomGrades(classId);
    }
  }, [classId, fetchClassroomGrades]);

  // Sort grades
  const filteredAndSortedGrades = useMemo(() => {
    let sorted = [...grades];
    if (statusFilter !== "all") {
      sorted = sorted.filter((g) => g.status === statusFilter);
    }

    switch (sortBy) {
      case "grade_desc":
        sorted.sort((a, b) => {
          const gradeA = a.grade ?? 0;
          const gradeB = b.grade ?? 0;
          return gradeB - gradeA;
        });
        break;
      case "grade_asc":
        sorted.sort((a, b) => {
          const gradeA = a.grade ?? 0;
          const gradeB = b.grade ?? 0;
          return gradeA - gradeB;
        });
        break;
      case "due_date":
        sorted.sort((a, b) => {
          const timeA = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
          const timeB = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
          return timeA - timeB;
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
  }, [grades, sortBy, statusFilter]);

  const formatDate = (value: string | null | undefined) => {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getGradeBadgeClass = (grade: number | null) => {
    if (grade === null) {
      return "bg-amber-50 text-amber-700 border border-amber-100";
    }
    if (grade >= 5) {
      return "bg-emerald-50 text-emerald-700 border border-emerald-100";
    }
    return "bg-rose-50 text-rose-700 border border-rose-100";
  };

  const handleOpenFeedback = (grade: GradeEntry) => {
    if (!grade.feedback) return;
    setSelectedFeedback({
      assignmentTitle: grade.assignmentTitle,
      feedback: grade.feedback,
    });
    setFeedbackOpen(true);
  };

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 sm:p-6 text-rose-700">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold mb-1">Lỗi tải danh sách điểm số</h3>
            <p className="text-sm mb-4 text-rose-600">{error}</p>
            <Button
              onClick={() => fetchClassroomGrades(classId)}
              size="sm"
              color="green"
            >
              Thử lại
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title={<span className="text-green-700">Điểm số của lớp</span>}
        actions={
          <div className="flex items-center gap-2 sm:gap-3">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide hidden sm:block">
              Sắp xếp
            </label>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(
                    e.target.value as
                      | "newest"
                      | "grade_desc"
                      | "grade_asc"
                      | "due_date"
                  )
                }
                className="appearance-none px-3 sm:px-4 pr-8 sm:pr-9 py-2 bg-white/90 rounded-lg border border-slate-200 text-xs sm:text-sm text-slate-700 font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
              >
                <option value="newest">Mới nhất</option>
                <option value="grade_desc">Điểm cao nhất</option>
                <option value="grade_asc">Điểm thấp nhất</option>
                <option value="due_date">Hạn nộp</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 sm:right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            </div>
          </div>
        }
      />

      {/* Statistics */}
      <StatsGrid
        items={([
          {
            icon: <Award className="h-6 w-6 text-green-600" />,
            color: "from-green-200 to-emerald-100",
            label: "Điểm trung bình",
            value: statistics.averageGrade > 0 ? statistics.averageGrade.toFixed(1) : "N/A",
          },
          {
            icon: <CheckCircle2 className="h-6 w-6 text-emerald-600" />,
            color: "from-emerald-200 to-green-100",
            label: "Đã chấm",
            value: String(statistics.totalGraded ?? 0),
          },
          {
            icon: <Clock className="h-6 w-6 text-amber-600" />,
            color: "from-amber-200 to-orange-100",
            label: "Chưa chấm",
            value: String(statistics.totalPending ?? 0),
          },
        ]) as StatItem[]}
        onItemClick={(_, idx) => {
          if (idx === 0) setStatusFilter("all");
          if (idx === 1) setStatusFilter("graded");
          if (idx === 2) setStatusFilter("submitted");
        }}
      />

      {/* Grades Table */}
      {isLoading ? (
        <div className="bg-white/90 rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="space-y-3 p-4 sm:p-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="h-4 bg-slate-200 rounded flex-1" />
                <div className="h-4 bg-slate-100 rounded w-20" />
                <div className="h-4 bg-slate-100 rounded w-20" />
              </div>
            ))}
          </div>
        </div>
      ) : filteredAndSortedGrades.length === 0 ? (
        <div className="bg-white/90 rounded-2xl border border-slate-100 p-8 sm:p-12 text-center shadow-sm">
          <div className="flex justify-center mb-4">
            <BarChart3 className="h-12 w-12 text-green-600" />
          </div>
          <h3 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2">
            Chưa có điểm số nào
          </h3>
          <p className="text-sm sm:text-base text-slate-600">
            Khi bạn nộp bài và được chấm điểm, bảng điểm sẽ hiển thị tại đây.
          </p>
        </div>
      ) : (
        <div className="bg-white/90 rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-green-50/60 border-b border-slate-200">
                <TableHead className="text-xs font-semibold tracking-wide text-slate-600 uppercase">
                  Bài tập
                </TableHead>
                <TableHead className="text-xs font-semibold tracking-wide text-slate-600 uppercase">
                  Loại
                </TableHead>
                <TableHead className="text-xs font-semibold tracking-wide text-slate-600 uppercase">
                  Hạn nộp
                </TableHead>
                <TableHead className="text-xs font-semibold tracking-wide text-slate-600 uppercase">
                  Ngày nộp
                </TableHead>
                <TableHead className="text-xs font-semibold tracking-wide text-slate-600 uppercase">
                  Điểm
                </TableHead>
                <TableHead className="text-xs font-semibold tracking-wide text-slate-600 uppercase">
                  Nhận xét
                </TableHead>
                <TableHead className="text-xs font-semibold tracking-wide text-slate-600 uppercase">
                  Trạng thái
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedGrades.map((grade) => (
                <TableRow key={grade.id} className="hover:bg-green-50/40 transition-colors">
                  <TableCell className="font-medium text-slate-900">
                    {grade.assignmentTitle}
                  </TableCell>
                  <TableCell>
                    <AssignmentTypeBadge type={grade.assignmentType as any} />
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {formatDate(grade.dueDate ?? null)}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {grade.submittedAt ? formatDate(grade.submittedAt) : "Chưa nộp"}
                  </TableCell>
                  <TableCell>
                    {grade.grade !== null ? (
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${getGradeBadgeClass(
                          grade.grade
                        )}`}
                      >
                        {grade.grade.toFixed(1)}
                      </span>
                    ) : (
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${getGradeBadgeClass(
                          null
                        )}`}
                      >
                        Chưa chấm
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {grade.feedback ? (
                      <button
                        type="button"
                        onClick={() => handleOpenFeedback(grade)}
                        className="inline-flex items-center gap-1 rounded-full border border-green-100 bg-green-50 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-100 hover:border-green-200 transition-colors shadow-sm"
                      >
                        <MessageCircle className="h-4 w-4" />
                        <span>Xem</span>
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400 italic">
                        Không có
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <GradeStatusBadge status={grade.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {selectedFeedback && (
        <Dialog
          open={feedbackOpen}
          onOpenChange={(open) => {
            setFeedbackOpen(open);
            if (!open) {
              setSelectedFeedback(null);
            }
          }}
        >
          <DialogContent onClose={() => setFeedbackOpen(false)}>
            <DialogHeader>
              <DialogTitle>Nhận xét của giáo viên</DialogTitle>
              <DialogDescription>
                Bài tập:{" "}
                <span className="font-medium">
                  {selectedFeedback.assignmentTitle}
                </span>
              </DialogDescription>
            </DialogHeader>
            <div className="px-6 py-4 text-sm text-slate-800 whitespace-pre-line max-h-[50vh] overflow-y-auto">
              {selectedFeedback.feedback}
            </div>
            <DialogFooter>
              <Button onClick={() => setFeedbackOpen(false)}>Đóng</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}