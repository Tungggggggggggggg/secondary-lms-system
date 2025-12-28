"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import HeaderParent from "@/components/parent/ParentHeader";
import { EmptyState } from "@/components/shared";
import CardGridSkeleton from "@/components/shared/loading/CardGridSkeleton";
import CardListSkeleton from "@/components/shared/loading/CardListSkeleton";
import {
  ChevronDown,
  ChevronUp,
  Award,
  BookOpen,
  Users,
  BarChart3,
  ArrowRight,
} from "lucide-react";


interface Student {
  id: string;
  email: string;
  fullname: string;
  role: string;
}

interface GradeEntry {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  assignmentType: string;
  dueDate: string | null;
  grade: number | null;
  feedback: string | null;
  submittedAt: string | null;
  status: "pending" | "submitted" | "graded";
  classroom: {
    id: string;
    name: string;
    code: string;
    icon: string;
    teacher?: {
      id: string;
      fullname: string;
      email: string;
    };
  } | null;
}

interface StudentGradesData {
  student: Student;
  grades: GradeEntry[];
  statistics: {
    totalSubmissions: number;
    totalGraded: number;
    totalPending: number;
    averageGrade: number;
  };
}

interface AllChildrenGradesResponse {
  success: boolean;
  data: StudentGradesData[];
  statistics: {
    totalChildren: number;
    totalSubmissions: number;
    totalGraded: number;
    totalPending: number;
    overallAverage: number;
  };
}

/**
 * Trang tiáº¿n Ä‘á»™ há»c táº­p - Hiá»ƒn thá»‹ káº¿t quáº£ há»c táº­p cá»§a táº¥t cáº£ con
 */
export default function ParentProgressPage() {
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<"name" | "average" | "submissions">("name");

  const { data, error, isLoading } = useSWR<AllChildrenGradesResponse>(
    "/api/parent/children/grades",
    {
      revalidateOnFocus: false,
      dedupingInterval: 60_000,
      keepPreviousData: true,
    }
  );

  const studentsData = data?.data || [];
  const overallStats = data?.statistics || {
    totalChildren: 0,
    totalSubmissions: 0,
    totalGraded: 0,
    totalPending: 0,
    overallAverage: 0,
  };

  // Sort students
  const sortedStudents = useMemo(() => {
    const sorted = [...studentsData];
    switch (sortBy) {
      case "average":
        sorted.sort((a, b) => b.statistics.averageGrade - a.statistics.averageGrade);
        break;
      case "submissions":
        sorted.sort((a, b) => b.statistics.totalSubmissions - a.statistics.totalSubmissions);
        break;
      case "name":
      default:
        sorted.sort((a, b) => a.student.fullname.localeCompare(b.student.fullname));
        break;
    }
    return sorted;
  }, [studentsData, sortBy]);

  const toggleStudent = (studentId: string) => {
    const newExpanded = new Set(expandedStudents);
    if (newExpanded.has(studentId)) {
      newExpanded.delete(studentId);
    } else {
      newExpanded.add(studentId);
    }
    setExpandedStudents(newExpanded);
  };

  if (isLoading) {
    return (
      <>
        <HeaderParent
          title="Tiến độ học tập"
          subtitle="Tổng quan kết quả học tập của tất cả con"
        />
        <CardGridSkeleton
          items={4}
          gridClassName="grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
          itemClassName="h-32 rounded-2xl"
        />
        <CardListSkeleton items={2} simple simpleItemClassName="h-24" />
      </>
    );
  }

  if (error || !data?.success) {
    return (
      <>
        <HeaderParent
          title="Tiến độ học tập"
          subtitle="Tổng quan kết quả học tập của tất cả con"
        />
        <EmptyState
          icon="❌"
          title="Có lỗi xảy ra"
          description="Không thể tải dữ liệu tiến độ học tập. Vui lòng thử lại sau."
          variant="parent"
        />
      </>
    );
  }

  return (
    <>
      <HeaderParent
        title="Tiến độ học tập"
        subtitle="Tổng quan kết quả học tập của tất cả con"
      />

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-amber-100 hover:border-amber-200 hover:shadow-lg transition-all duration-300 hover:scale-102 group bg-gradient-to-br from-amber-50/50 to-orange-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-amber-700">Tổng số con</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-amber-200 to-orange-300 rounded-lg group-hover:scale-110 transition-transform duration-300">
                <Users className="h-6 w-6 text-amber-700" />
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-900">{overallStats.totalChildren}</div>
                <p className="text-xs text-amber-600 font-medium">học sinh</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-100 hover:border-amber-200 hover:shadow-lg transition-all duration-300 hover:scale-102 group bg-gradient-to-br from-amber-50/50 to-orange-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-amber-700">Điểm trung bình</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-amber-200 to-orange-300 rounded-lg group-hover:scale-110 transition-transform duration-300">
                <BarChart3 className="h-6 w-6 text-amber-700" />
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-900">
                  {overallStats.overallAverage > 0
                    ? overallStats.overallAverage.toFixed(1)
                    : "N/A"}
                </div>
                <p className="text-xs text-amber-600 font-medium">tổng thể</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-100 hover:border-amber-200 hover:shadow-lg transition-all duration-300 hover:scale-102 group bg-gradient-to-br from-amber-50/50 to-orange-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-amber-700">Đã chấm</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-amber-200 to-orange-300 rounded-lg group-hover:scale-110 transition-transform duration-300">
                <Award className="h-6 w-6 text-amber-700" />
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-900">
                  {overallStats.totalGraded}
                </div>
                <p className="text-xs text-amber-600 font-medium">bài tập</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-100 hover:border-amber-200 hover:shadow-lg transition-all duration-300 hover:scale-102 group bg-gradient-to-br from-amber-50/50 to-orange-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-amber-700">Chưa chấm</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-amber-200 to-orange-300 rounded-lg group-hover:scale-110 transition-transform duration-300">
                <BookOpen className="h-6 w-6 text-amber-700" />
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-900">
                  {overallStats.totalPending}
                </div>
                <p className="text-xs text-amber-600 font-medium">bài tập</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sort Options */}
      {studentsData.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-foreground">Sắp xếp theo:</label>
            <Select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as "name" | "average" | "submissions")
              }
              aria-label="Sắp xếp theo"
              color="amber"
              className="min-w-[180px]"
            >
              <option value="name">Tên</option>
              <option value="average">Điểm trung bình</option>
              <option value="submissions">Số bài nộp</option>
            </Select>
          </div>
        </div>
      )}

      {/* Students List */}
      {studentsData.length === 0 ? (
        <EmptyState
          icon="📚"
          title="Chưa có dữ liệu học tập"
          description="Con bạn chưa có bài nộp nào hoặc chưa được liên kết."
          variant="parent"
          action={
            <Link href="/dashboard/parent/children">
              <Button color="amber">Quản lý con</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {sortedStudents.map((studentData) => {
            const { student, grades, statistics } = studentData;
            const isExpanded = expandedStudents.has(student.id);

            return (
              <Card key={student.id} className="overflow-hidden border-amber-100 hover:border-amber-200 transition-all duration-300 group">
                <CardHeader
                  className="cursor-pointer hover:bg-amber-50/50 transition-colors p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  onClick={() => toggleStudent(student.id)}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isExpanded}
                  onKeyDown={(event) => {
                    if (event.currentTarget !== event.target) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      toggleStudent(student.id);
                    }
                  }}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                        {student.fullname?.charAt(0).toUpperCase() || "S"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg text-foreground group-hover:text-amber-800 transition-colors duration-300">{student.fullname}</CardTitle>
                        <CardDescription className="text-sm text-muted-foreground">{student.email}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-center hidden sm:block">
                        <div className="text-xs text-muted-foreground font-semibold">Điểm TB</div>
                        <div className="text-lg font-bold text-amber-700">
                          {statistics.totalGraded > 0
                            ? statistics.averageGrade.toFixed(1)
                            : "N/A"}
                        </div>
                      </div>
                      <div className="text-center hidden sm:block">
                        <div className="text-xs text-muted-foreground font-semibold">Đã chấm</div>
                        <div className="text-lg font-bold text-amber-700">
                          {statistics.totalGraded}
                        </div>
                      </div>
                      <div className="text-center hidden sm:block">
                        <div className="text-xs text-muted-foreground font-semibold">Tổng bài</div>
                        <div className="text-lg font-bold text-amber-700">
                          {statistics.totalSubmissions}
                        </div>
                      </div>
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-md text-amber-700" aria-hidden>
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </span>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0 p-5">
                    <div className="border-t border-amber-200/50 pt-4 space-y-4">
                      {/* Quick Actions */}
                      <div className="flex gap-2 flex-wrap">
                        <Link href={`/dashboard/parent/children/${student.id}/grades`}>
                          <Button color="amber" size="sm" className="flex items-center gap-1.5">
                            Xem chi tiết
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/dashboard/parent/children/${student.id}`}>
                          <Button variant="outline" color="amber" size="sm">
                            Xem thông tin
                          </Button>
                        </Link>
                      </div>

                      {/* Grades Table */}
                      {grades.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>Chưa có bài nộp nào</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {(() => {
                            const sortedGrades = [...grades].sort((a, b) => {
                              const ta = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
                              const tb = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
                              return tb - ta;
                            });
                            const preview = sortedGrades.slice(0, 8);
                            return (
                              <>
                                {preview.map((grade) => {
                                  const statusLabel =
                                    grade.status === "graded"
                                      ? "✓ Đã chấm"
                                      : grade.status === "submitted"
                                      ? "Đã nộp"
                                      : "Chờ chấm";
                                  const statusClass =
                                    grade.status === "graded"
                                      ? "bg-amber-100 text-amber-700"
                                      : grade.status === "submitted"
                                      ? "bg-orange-100 text-orange-700"
                                      : "bg-muted/40 text-muted-foreground";

                                  return (
                                    <div
                                      key={grade.id}
                                      className="bg-white/90 rounded-2xl border border-amber-100 shadow-[0_10px_30px_rgba(15,23,42,0.06)] p-4 sm:p-5"
                                    >
                                      <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-2 text-sm font-semibold text-foreground truncate">
                                            {grade.classroom ? (
                                              <>
                                                <span>{grade.classroom.icon}</span>
                                                <span className="truncate">{grade.classroom.name}</span>
                                              </>
                                            ) : (
                                              <span className="text-muted-foreground">N/A</span>
                                            )}
                                          </div>

                                          <div className="mt-1 text-base font-semibold text-foreground truncate">
                                            {grade.assignmentTitle}
                                          </div>

                                          <div className="mt-2 flex flex-wrap items-center gap-2">
                                            <span
                                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                                grade.assignmentType === "ESSAY"
                                                  ? "bg-amber-100 text-amber-700"
                                                  : "bg-orange-100 text-orange-700"
                                              }`}
                                            >
                                              {grade.assignmentType === "ESSAY" ? "Tự luận" : "Trắc nghiệm"}
                                            </span>

                                            {grade.grade !== null ? (
                                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-100">
                                                {grade.grade.toFixed(1)}
                                              </span>
                                            ) : (
                                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-muted/40 text-muted-foreground border border-border">
                                                Chưa chấm
                                              </span>
                                            )}

                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusClass}`}>
                                              {statusLabel}
                                            </span>
                                          </div>

                                          <div className="mt-2 text-xs text-muted-foreground">
                                            Ngày nộp:{" "}
                                            {grade.submittedAt
                                              ? new Date(grade.submittedAt).toLocaleDateString("vi-VN", {
                                                  day: "2-digit",
                                                  month: "2-digit",
                                                  year: "numeric",
                                                })
                                              : "—"}
                                          </div>

                                          {grade.feedback ? (
                                            <div className="mt-2 text-sm text-muted-foreground whitespace-pre-line">
                                              {grade.feedback}
                                            </div>
                                          ) : null}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}

                                {sortedGrades.length > preview.length ? (
                                  <div className="text-xs text-muted-foreground">
                                    Đang hiển thị {preview.length}/{sortedGrades.length} bài gần nhất. Xem đầy đủ ở trang “Xem chi tiết”.
                                  </div>
                                ) : null}
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}



