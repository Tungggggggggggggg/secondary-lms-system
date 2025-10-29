"use client";

import { useRouter } from "next/navigation";

export default function AssignmentList() {
  const router = useRouter();
  
  const assignments = [
    {
      id: 1,
      title: "Chiến tranh thế giới thứ 2",
      subject: "Lịch sử",
      class: "8A1",
      dueDate: "30/10/2025",
      submissions: 28,
      totalStudents: 32,
      status: "Đang diễn ra",
      type: "Bài tập về nhà"
    },
    {
      id: 2, 
      title: "Địa hình Đông Nam Á",
      subject: "Địa lý",
      class: "9B2",
      dueDate: "01/11/2025",
      submissions: 15,
      totalStudents: 28,
      status: "Đang diễn ra",
      type: "Kiểm tra 15 phút"
    },
    {
      id: 3,
      title: "Modal Verbs Practice",
      subject: "Tiếng Anh",
      class: "7C",
      dueDate: "29/10/2025",
      submissions: 35,
      totalStudents: 35,
      status: "Đã hết hạn",
      type: "Bài tập về nhà"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Đang diễn ra":
        return "bg-green-100 text-green-600";
      case "Đã hết hạn":
        return "bg-red-100 text-red-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "Bài tập về nhà":
        return "bg-blue-100 text-blue-600";
      case "Kiểm tra 15 phút":
        return "bg-purple-100 text-purple-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <div className="space-y-4">
      {assignments.map((assignment) => (
        <div
          key={assignment.id}
          className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer"
          onClick={() => router.push(`/dashboard/teacher/assignments/${assignment.id}`)}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-gray-800">
                {assignment.title}
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>{assignment.subject}</span>
                <span className="text-gray-300">•</span>
                <span>{assignment.class}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(assignment.status)}`}>
                {assignment.status}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(assignment.type)}`}>
                {assignment.type}
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <span className="text-gray-600">📅 Hạn nộp:</span>
                <span className="font-medium text-gray-800">{assignment.dueDate}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="text-gray-600">📥 Đã nộp:</span>
                <span className="font-medium text-gray-800">
                  {assignment.submissions}/{assignment.totalStudents}
                </span>
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/dashboard/teacher/assignments/${assignment.id}/edit`);
                }}
                className="px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-xl transition-all"
              >
                ✏️ Chỉnh sửa
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/dashboard/teacher/assignments/${assignment.id}/submissions`);
                }}
                className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
              >
                📝 Chấm bài
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full"
                style={{
                  width: `${(assignment.submissions / assignment.totalStudents) * 100}%`
                }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}