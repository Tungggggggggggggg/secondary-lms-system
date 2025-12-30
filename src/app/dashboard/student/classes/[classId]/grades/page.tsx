"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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

  const { grades, statistics, pagination, isLoading, error, fetchClassroomGradesPaged } =
    useStudentGrades();

  const [sortBy, setSortBy] = useState<
    "newest" | "grade_desc" | "grade_asc" | "due_date"
  >("newest");
  const [statusFilter, setStatusFilter] = useState<"all" | "graded" | "submitted" | "pending">("all");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<
    { assignmentTitle: string; feedback: string } | null
  >(null);

  // Load grades (server-side status/sort/pagination)
  useEffect(() => {
    if (classId) {
      setPage(1);
      fetchClassroomGradesPaged(classId, {
        page: 1,
        pageSize,
        status: statusFilter,
        sort: sortBy,
        append: false,
      });
    }
  }, [classId, fetchClassroomGradesPaged, sortBy, statusFilter]);

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
              onClick={() =>
                fetchClassroomGradesPaged(classId, {
                  page: 1,
                  pageSize,
                  status: statusFilter,
                  sort: sortBy,
                  append: false,
                })
              }
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
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:block">
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
                className="appearance-none px-3 sm:px-4 pr-8 sm:pr-9 py-2 bg-background rounded-lg border border-border text-xs sm:text-sm text-foreground font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors"
              >
                <option value="newest">Mới nhất</option>
                <option value="grade_desc">Điểm cao nhất</option>
                <option value="grade_asc">Điểm thấp nhất</option>
                <option value="due_date">Hạn nộp</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 sm:right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
            value: (statistics.totalGraded ?? 0) > 0 ? statistics.averageGrade.toFixed(1) : "N/A",
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

      {/* Grades List */}
      {isLoading && grades.length === 0 ? (
        <div className="bg-card/90 rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="space-y-3 p-4 sm:p-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="h-4 bg-muted rounded flex-1" />
                <div className="h-4 bg-muted rounded w-20" />
                <div className="h-4 bg-muted rounded w-20" />
              </div>
            ))}
          </div>
        </div>
      ) : grades.length === 0 ? (
        <div className="bg-card/90 rounded-2xl border border-border p-8 sm:p-12 text-center shadow-sm">
          <div className="flex justify-center mb-4">
            <BarChart3 className="h-12 w-12 text-green-600" />
          </div>
          <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
            Chưa có điểm số nào
          </h3>
          <p className="text-sm sm:text-base text-muted-foreground">
            Khi bạn nộp bài và được chấm điểm, bảng điểm sẽ hiển thị tại đây.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {grades.map((grade) => (
            <div
              key={grade.id}
              className="bg-card/90 rounded-2xl border border-border shadow-sm p-4 sm:p-5 hover:bg-green-50/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-base font-semibold text-foreground truncate">
                    {grade.assignmentTitle}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <AssignmentTypeBadge type={grade.assignmentType} />

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

                    <GradeStatusBadge status={grade.status} />
                  </div>

                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-muted-foreground">
                    <div>Hạn nộp: {formatDate(grade.dueDate ?? null)}</div>
                    <div>
                      Ngày nộp: {grade.submittedAt ? formatDate(grade.submittedAt) : "Chưa nộp"}
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
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
                    <span className="text-xs text-muted-foreground italic">Không có</span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {pagination?.hasMore ? (
            <div className="pt-2 flex justify-center">
              <Button
                color="green"
                disabled={isLoading}
                onClick={() => {
                  const nextPage = page + 1;
                  setPage(nextPage);
                  fetchClassroomGradesPaged(classId, {
                    page: nextPage,
                    pageSize,
                    status: statusFilter,
                    sort: sortBy,
                    append: true,
                  });
                }}
              >
                {isLoading ? "Đang tải..." : "Tải thêm"}
              </Button>
            </div>
          ) : null}
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
            <div className="px-6 py-4 text-sm text-foreground whitespace-pre-line max-h-[50vh] overflow-y-auto">
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