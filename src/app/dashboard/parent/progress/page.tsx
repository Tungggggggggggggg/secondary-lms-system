"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import HeaderParent from "@/components/parent/ParentHeader";
import { EmptyState } from "@/components/shared";
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
  submittedAt: string;
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
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
            <label className="text-sm font-medium text-gray-700">Sắp xếp theo:</label>
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as "name" | "average" | "submissions")
              }
              aria-label="Sắp xếp theo"
              className="px-4 py-2 bg-white rounded-xl border-2 border-amber-300 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all duration-200"
            >
              <option value="name">Tên</option>
              <option value="average">Điểm trung bình</option>
              <option value="submissions">Số bài nộp</option>
            </select>
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
                  className="cursor-pointer hover:bg-amber-50/50 transition-colors p-5"
                  onClick={() => toggleStudent(student.id)}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                        {student.fullname?.charAt(0).toUpperCase() || "S"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg text-gray-900 group-hover:text-amber-800 transition-colors duration-300">{student.fullname}</CardTitle>
                        <CardDescription className="text-sm text-gray-600">{student.email}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-center hidden sm:block">
                        <div className="text-xs text-gray-500 font-semibold">Điểm TB</div>
                        <div className="text-lg font-bold text-amber-700">
                          {statistics.averageGrade > 0
                            ? statistics.averageGrade.toFixed(1)
                            : "N/A"}
                        </div>
                      </div>
                      <div className="text-center hidden sm:block">
                        <div className="text-xs text-gray-500 font-semibold">Đã chấm</div>
                        <div className="text-lg font-bold text-amber-700">
                          {statistics.totalGraded}
                        </div>
                      </div>
                      <div className="text-center hidden sm:block">
                        <div className="text-xs text-gray-500 font-semibold">Tổng bài</div>
                        <div className="text-lg font-bold text-amber-700">
                          {statistics.totalSubmissions}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="text-amber-700">
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </Button>
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
                        <div className="text-center py-8 text-gray-500">
                          <p>Chưa có bài nộp nào</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Lớp học</TableHead>
                                <TableHead>Bài tập</TableHead>
                                <TableHead>Loại</TableHead>
                                <TableHead>Điểm</TableHead>
                                <TableHead>Nhận xét</TableHead>
                                <TableHead>Ngày nộp</TableHead>
                                <TableHead>Trạng thái</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {grades.map((grade) => (
                                <TableRow key={grade.id}>
                                  <TableCell>
                                    {grade.classroom ? (
                                      <div className="flex items-center gap-2">
                                        <span>{grade.classroom.icon}</span>
                                        <span className="font-medium">
                                          {grade.classroom.name}
                                        </span>
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
                                          ? "bg-amber-100 text-amber-700"
                                          : "bg-orange-100 text-orange-700"
                                      }`}
                                    >
                                      {grade.assignmentType === "ESSAY"
                                        ? "Tự luận"
                                        : "Trắc nghiệm"}
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    {grade.grade !== null ? (
                                      <span className="font-bold text-amber-700">
                                        {grade.grade.toFixed(1)}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">Chưa chấm</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {grade.feedback ? (
                                      <span className="text-sm text-gray-700">
                                        {grade.feedback}
                                      </span>
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
                                  <TableCell>
                                    <span
                                      className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${
                                        grade.status === "graded"
                                          ? "bg-amber-100 text-amber-700"
                                          : grade.status === "submitted"
                                          ? "bg-orange-100 text-orange-700"
                                          : "bg-gray-100 text-gray-700"
                                      }`}
                                    >
                                      {grade.status === "graded"
                                        ? "✓ Đã chấm"
                                        : grade.status === "submitted"
                                        ? "Đã nộp"
                                        : "Chờ chấm"}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
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



