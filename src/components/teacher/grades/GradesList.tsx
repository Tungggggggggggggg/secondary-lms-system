"use client";

import { useRouter } from "next/navigation";

export default function GradesList() {
  const router = useRouter();

  const grades = [
    {
      class: "8A1",
      subject: "Lịch sử",
      totalStudents: 32,
      averageScore: 8.2,
      distribution: {
        excellent: 12,
        good: 15,
        average: 4,
        poor: 1
      },
      recentTest: "Kiểm tra giữa kỳ",
      lastUpdate: "2 ngày trước"
    },
    {
      class: "9B2",
      subject: "Địa lý",
      totalStudents: 28,
      averageScore: 7.8,
      distribution: {
        excellent: 8,
        good: 12,
        average: 6,
        poor: 2
      },
      recentTest: "Bài kiểm tra 15 phút",
      lastUpdate: "1 ngày trước"
    },
    {
      class: "7C",
      subject: "Tiếng Anh",
      totalStudents: 35,
      averageScore: 8.5,
      distribution: {
        excellent: 15,
        good: 14,
        average: 5,
        poor: 1
      },
      recentTest: "Bài kiểm tra cuối kỳ",
      lastUpdate: "3 giờ trước"
    }
  ];

  const getGradeColor = (score: number) => {
    if (score >= 8.0) return "text-green-600";
    if (score >= 6.5) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-6">
      {grades.map((grade, idx) => (
        <div
          key={idx}
          className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer"
          onClick={() => router.push(`/dashboard/teacher/grades/${grade.class}`)}
        >
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-1">
                {grade.subject} - Lớp {grade.class}
              </h3>
              <div className="text-sm text-gray-600">
                {grade.totalStudents} học sinh • Cập nhật {grade.lastUpdate}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Handle export grades
              }}
              className="px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-xl transition-all"
            >
              📊 Xuất điểm
            </button>
          </div>

          {/* Grade Distribution */}
          <div className="grid grid-cols-2 gap-6">
            {/* Left column */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-600">Điểm trung bình</span>
                <span className={`text-lg font-bold ${getGradeColor(grade.averageScore)}`}>
                  {grade.averageScore}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-600">Bài kiểm tra gần đây</span>
                <span className="text-gray-800 font-medium">{grade.recentTest}</span>
              </div>
            </div>

            {/* Right column - Grade distribution */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-green-600">Giỏi ({grade.distribution.excellent})</span>
                <div className="w-2/3 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${(grade.distribution.excellent / grade.totalStudents) * 100}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-blue-600">Khá ({grade.distribution.good})</span>
                <div className="w-2/3 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${(grade.distribution.good / grade.totalStudents) * 100}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-yellow-600">TB ({grade.distribution.average})</span>
                <div className="w-2/3 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-yellow-500 rounded-full"
                    style={{ width: `${(grade.distribution.average / grade.totalStudents) * 100}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-red-600">Yếu ({grade.distribution.poor})</span>
                <div className="w-2/3 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-red-500 rounded-full"
                    style={{ width: `${(grade.distribution.poor / grade.totalStudents) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}