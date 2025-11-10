"use client";

import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Award,
  BookOpen,
  Users,
  BarChart3,
  ArrowRight,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

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
 * Trang tiến độ học tập - Hiển thị kết quả học tập của tất cả con
 */
export default function ParentProgressPage() {
  const { data: session } = useSession();
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<"name" | "average" | "submissions">("name");

  const { data, error, isLoading } = useSWR<AllChildrenGradesResponse>(
    "/api/parent/children/grades",
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
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
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (error || !data?.success) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-red-600">Có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại sau.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Tiến độ học tập</h1>
        <p className="text-gray-600">Tổng quan kết quả học tập của tất cả con</p>
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Tổng số con</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-8 w-8 text-indigo-500" />
              <div>
                <div className="text-2xl font-bold">{overallStats.totalChildren}</div>
                <p className="text-xs text-gray-500">học sinh</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Điểm trung bình</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-8 w-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {overallStats.overallAverage > 0
                    ? overallStats.overallAverage.toFixed(1)
                    : "N/A"}
                </div>
                <p className="text-xs text-gray-500">tổng thể</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Đã chấm</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Award className="h-8 w-8 text-blue-500" />
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {overallStats.totalGraded}
                </div>
                <p className="text-xs text-gray-500">bài tập</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Chưa chấm</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <BookOpen className="h-8 w-8 text-orange-500" />
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {overallStats.totalPending}
                </div>
                <p className="text-xs text-gray-500">bài tập</p>
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
              className="px-4 py-2 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Chưa có dữ liệu học tập
            </h3>
            <p className="text-gray-600 mb-4">
              Con bạn chưa có bài nộp nào hoặc chưa được liên kết.
            </p>
            <Link href="/dashboard/parent/children">
              <Button>Quản lý con</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedStudents.map((studentData) => {
            const { student, grades, statistics } = studentData;
            const isExpanded = expandedStudents.has(student.id);

            return (
              <Card key={student.id} className="overflow-hidden">
                <CardHeader
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleStudent(student.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {student.fullname?.charAt(0).toUpperCase() || "S"}
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">{student.fullname}</CardTitle>
                        <CardDescription>{student.email}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-sm text-gray-500">Điểm TB</div>
                        <div className="text-xl font-bold text-green-600">
                          {statistics.averageGrade > 0
                            ? statistics.averageGrade.toFixed(1)
                            : "N/A"}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-gray-500">Đã chấm</div>
                        <div className="text-xl font-bold text-blue-600">
                          {statistics.totalGraded}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-gray-500">Tổng bài</div>
                        <div className="text-xl font-bold text-gray-700">
                          {statistics.totalSubmissions}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon">
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
                  <CardContent className="pt-0">
                    <div className="border-t pt-4 space-y-4">
                      {/* Quick Actions */}
                      <div className="flex gap-2">
                        <Link href={`/dashboard/parent/children/${student.id}/grades`}>
                          <Button variant="outline" size="sm">
                            Xem chi tiết điểm số
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        </Link>
                        <Link href={`/dashboard/parent/children/${student.id}`}>
                          <Button variant="outline" size="sm">
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
                                          ? "bg-indigo-50 text-indigo-700"
                                          : "bg-pink-50 text-pink-700"
                                      }`}
                                    >
                                      {grade.assignmentType === "ESSAY"
                                        ? "📝 Tự luận"
                                        : "❓ Trắc nghiệm"}
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
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

