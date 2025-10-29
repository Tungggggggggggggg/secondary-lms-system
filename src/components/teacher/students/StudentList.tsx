"use client";

import { useRouter } from "next/navigation";

export default function StudentList() {
  const router = useRouter();

  const students = [
    {
      id: 1,
      name: "Nguyễn Văn A",
      avatar: "A",
      class: "8A1",
      averageScore: 8.5,
      attendance: 95,
      assignments: {
        completed: 28,
        total: 30
      },
      status: "active"
    },
    {
      id: 2,
      name: "Trần Thị B",
      avatar: "B",
      class: "9B2",
      averageScore: 9.0,
      attendance: 98,
      assignments: {
        completed: 25,
        total: 25
      },
      status: "active"
    },
    {
      id: 3,
      name: "Lê Văn C",
      avatar: "C",
      class: "7C",
      averageScore: 7.5,
      attendance: 85,
      assignments: {
        completed: 18,
        total: 20
      },
      status: "warning"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-600";
      case "warning":
        return "bg-yellow-100 text-yellow-600";
      case "inactive":
        return "bg-red-100 text-red-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "Hoạt động tốt";
      case "warning":
        return "Cần chú ý";
      case "inactive":
        return "Không hoạt động";
      default:
        return status;
    }
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 8.0) return "text-green-600";
    if (score >= 6.5) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-4">
      {students.map((student) => (
        <div
          key={student.id}
          className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer"
          onClick={() => router.push(`/dashboard/teacher/students/${student.id}`)}
        >
          <div className="flex items-center gap-6">
            {/* Avatar */}
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center text-2xl text-white font-bold">
              {student.avatar}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-1">
                    {student.name}
                  </h3>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <span>Lớp {student.class}</span>
                    <span className={`${getStatusColor(student.status)} px-3 py-1 rounded-full`}>
                      {getStatusText(student.status)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Handle message student
                  }}
                  className="px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-xl transition-all"
                >
                  ✉️ Nhắn tin
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <div className="text-sm text-gray-600 mb-1">Điểm trung bình</div>
                  <div className={`text-lg font-bold ${getPerformanceColor(student.averageScore)}`}>
                    {student.averageScore}
                  </div>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <div className="text-sm text-gray-600 mb-1">Chuyên cần</div>
                  <div className="text-lg font-bold text-blue-600">
                    {student.attendance}%
                  </div>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <div className="text-sm text-gray-600 mb-1">Hoàn thành bài tập</div>
                  <div className="text-lg font-bold text-purple-600">
                    {student.assignments.completed}/{student.assignments.total}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}