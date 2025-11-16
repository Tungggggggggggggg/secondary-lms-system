"use client";

import useSWR from "swr";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

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
  }>("/api/parent/children/grades", fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

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

  const colors = [
    "bg-yellow-500",
    "bg-teal-500",
    "bg-blue-500",
    "bg-purple-500",
    "bg-pink-500",
  ];

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-extrabold text-gray-800 flex items-center gap-2">
            📊 Kết quả học tập
          </h2>
        </div>
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-16 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data?.success) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-extrabold text-gray-800 flex items-center gap-2">
            📊 Kết quả học tập
          </h2>
        </div>
        <div className="text-red-500 text-center py-4">
          {error ? `Có lỗi xảy ra: ${error}` : "Không thể tải dữ liệu"}
        </div>
      </div>
    );
  }

  if (childrenPerformance.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-extrabold text-gray-800 flex items-center gap-2">
            📊 Kết quả học tập
          </h2>
          <Link
            href="/dashboard/parent/progress"
            className="text-sm font-semibold text-purple-600 hover:text-purple-700"
          >
            Xem chi tiết →
          </Link>
        </div>
        <div className="text-center py-8 text-gray-500">
          <p>Chưa có dữ liệu điểm số</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-extrabold text-gray-800 flex items-center gap-2">
          📊 Kết quả học tập
        </h2>
        <Link
          href="/dashboard/parent/progress"
          className="text-sm font-semibold text-purple-600 hover:text-purple-700"
        >
          Xem chi tiết →
        </Link>
      </div>

      <div className="space-y-6">
        {childrenPerformance.map((child, index) => {
          const score = Math.round(child.average * 10); // Chuyển từ 0-10 sang 0-100
          const color = colors[index % colors.length];
          return (
            <Link
              key={child.id}
              href={`/dashboard/parent/children/${child.id}/grades`}
              className="block"
            >
              <div className="hover:bg-gray-50 rounded-lg p-3 -m-3 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-gray-900">{child.name}</h3>
                    <p className="text-sm text-gray-600">
                      Điểm trung bình: {child.average > 0 ? child.average.toFixed(1) : "—"}/10
                      {child.totalGraded > 0 && (
                        <> • {child.totalGraded} bài đã chấm</>
                      )}
                      {child.totalPending > 0 && (
                        <> • {child.totalPending} bài chờ chấm</>
                      )}
                    </p>
                  </div>
                  <span className="text-2xl font-bold text-gray-700">
                    {child.average > 0 ? `${score}%` : "—"}
                  </span>
                </div>
                {child.average > 0 && (
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`${color} h-3 rounded-full`}
                      style={{ width: `${score}%` }}
                    ></div>
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
  