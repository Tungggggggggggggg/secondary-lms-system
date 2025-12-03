"use client";

import useSWR from "swr";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import SectionCard from "@/components/shared/SectionCard";
import { BarChart3, BookOpen, Star, ThumbsUp, TrendingUp, AlertTriangle, ChevronRight } from "lucide-react";

interface GradeEntry {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  assignmentType: string;
  grade: number | null;
  classroom: {
    id: string;
    name: string;
    code: string;
  } | null;
}

interface StudentData {
  student: {
    id: string;
    email: string;
    fullname: string;
  };
  grades: GradeEntry[];
  statistics: {
    totalSubmissions: number;
    totalGraded: number;
    totalPending: number;
    averageGrade: number;
  };
}

export default function AcademicPerformance() {
  const { data, error, isLoading } = useSWR<{
    success?: boolean;
    data?: StudentData[];
    statistics?: {
      totalChildren: number;
      totalSubmissions: number;
      totalGraded: number;
      totalPending: number;
      overallAverage: number;
    };
  }>("/api/parent/children/grades");

  // Tính điểm trung bình theo từng con
  const childrenPerformance = (() => {
    if (!data?.data || data.data.length === 0) return [];

    return data.data
      .map((studentData) => {
        const gradedGrades = studentData.grades.filter((g) => g.grade !== null);
        const averageGrade =
          gradedGrades.length > 0
            ? gradedGrades.reduce((sum, g) => sum + (g.grade || 0), 0) / gradedGrades.length
            : 0;

        return {
          id: studentData.student.id,
          name: studentData.student.fullname,
          email: studentData.student.email,
          average: averageGrade,
          totalSubmissions: studentData.statistics.totalSubmissions,
          totalGraded: studentData.statistics.totalGraded,
          totalPending: studentData.statistics.totalPending,
        };
      })
      .sort((a, b) => b.average - a.average); // Sắp xếp theo điểm trung bình giảm dần
  })();

  const progressColors = [
    "bg-gradient-to-r from-amber-600 to-orange-600",
    "bg-gradient-to-r from-amber-500 to-orange-500",
    "bg-gradient-to-r from-amber-400 to-orange-400",
  ];

  if (isLoading) {
    return (
      <SectionCard title={<span className="flex items-center gap-2 text-amber-700"><BarChart3 className="h-5 w-5" /> Kết quả học tập</span>} className="parent-border">
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-16 bg-amber-200/30 rounded-lg"></div>
            </div>
          ))}
        </div>
      </SectionCard>
    );
  }

  if (error || !data?.success) {
    return (
      <SectionCard title={<span className="flex items-center gap-2 text-amber-700"><BarChart3 className="h-5 w-5" /> Kết quả học tập</span>} className="parent-border">
        <div className="text-amber-700 text-center py-4 font-medium">
          {error ? `Có lỗi xảy ra: ${error}` : "Không thể tải dữ liệu"}
        </div>
      </SectionCard>
    );
  }

  if (childrenPerformance.length === 0) {
    return (
      <SectionCard
        title={<span className="flex items-center gap-2 text-amber-700"><BarChart3 className="h-5 w-5" /> Kết quả học tập</span>}
        className="parent-border"
        actions={<Link href="/dashboard/parent/progress" className="text-sm font-semibold text-amber-600 hover:text-amber-700 inline-flex items-center">Xem chi tiết <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" /></Link>}
      >
        <div className="text-center py-8">
          <BookOpen className="w-12 h-12 mx-auto mb-3 text-amber-600" />
          <p className="text-amber-700 font-medium">Chưa có dữ liệu điểm số</p>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title={<span className="flex items-center gap-2 text-amber-700"><BarChart3 className="h-5 w-5" /> Kết quả học tập</span>}
      className="parent-border"
      actions={<Link href="/dashboard/parent/progress" className="text-sm font-semibold text-amber-600 hover:text-amber-700 inline-flex items-center">Xem chi tiết <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" /></Link>}
    >
      <div className="space-y-6">
        {childrenPerformance.map((child, index) => {
          const score = Math.round(child.average * 10);
          const progressColor = progressColors[index % progressColors.length];
          const getGradeStatus = (avg: number) => {
            if (avg >= 8) return { icon: <Star className="h-3 w-3" />, label: "Xuất sắc", badge: "bg-green-100 text-green-700" };
            if (avg >= 6.5) return { icon: <ThumbsUp className="h-3 w-3" />, label: "Tốt", badge: "bg-blue-100 text-blue-700" };
            if (avg >= 5) return { icon: <TrendingUp className="h-3 w-3" />, label: "Trung bình", badge: "bg-amber-100 text-amber-700" };
            return { icon: <AlertTriangle className="h-3 w-3" />, label: "Cần cải thiện", badge: "bg-red-100 text-red-700" };
          };

          const status = getGradeStatus(child.average);

          return (
            <Link
              key={child.id}
              href={`/dashboard/parent/children/${child.id}/grades`}
              className="block group"
            >
              <div className="hover:bg-white/60 rounded-lg p-4 -m-4 transition-all duration-300 border-l-4 border-l-transparent group-hover:border-l-amber-500 group-hover:shadow-md">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 group-hover:text-amber-700 transition-colors duration-300">{child.name}</h3>
                    <p className="text-sm text-gray-600 group-hover:text-gray-700 transition-colors duration-300">
                      Điểm trung bình: {child.average > 0 ? child.average.toFixed(1) : "—"}/10
                      {child.totalGraded > 0 && (
                        <> • {child.totalGraded} bài đã chấm</>
                      )}
                      {child.totalPending > 0 && (
                        <> • <span className="font-semibold text-orange-600">{child.totalPending} bài chờ chấm</span></>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                      {child.average > 0 ? `${score}%` : "—"}
                    </span>
                    <p className={`text-xs font-semibold mt-1 px-2 py-1 rounded-full inline-flex items-center gap-1 ${status.badge}`}>
                      {status.icon} {status.label}
                    </p>
                  </div>
                </div>
                {child.average > 0 && (
                  <div className="w-full bg-gray-200/50 rounded-full h-3 overflow-hidden">
                    <div
                      className={`${progressColor} h-3 rounded-full transition-all duration-500 ease-out`}
                      style={{ width: `${score}%` }}
                    ></div>
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </SectionCard>
  );
}