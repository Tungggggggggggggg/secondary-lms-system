"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createConversationFromTeacher } from "@/hooks/use-chat";

export type StudentListItem = {
  id: string;
  fullname: string;
  avatarInitial: string;
  classroomId: string;
  classroomName: string;
  classroomCode: string;
  averageGrade: number | null;
  submissionRate: number;
  submittedCount: number;
  totalAssignments: number;
  status: "active" | "warning" | "inactive";
};

type Props = {
  students: StudentListItem[];
};

export default function StudentList({ students }: Props) {
  const router = useRouter();
  const [sendingId, setSendingId] = useState<string | null>(null);

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

  const getPerformanceColor = (score: number | null) => {
    if (score === null) return "text-gray-500";
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
          onClick={() =>
            router.push(`/dashboard/teacher/classrooms/${student.classroomId}/people/${student.id}`)
          }
        >
          <div className="flex items-center gap-6">
            {/* Avatar */}
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center text-2xl text-white font-bold">
              {student.avatarInitial}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-1">
                    {student.fullname}
                  </h3>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <span>
                      Lớp {student.classroomCode} · {student.classroomName}
                    </span>
                    <span className={`${getStatusColor(student.status)} px-3 py-1 rounded-full`}>
                      {getStatusText(student.status)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (sendingId) return;
                    try {
                      setSendingId(student.id);
                      const res = await createConversationFromTeacher(
                        student.id,
                        true,
                        student.classroomId
                      );
                      const id = res?.conversationId as string | undefined;
                      if (id) {
                        router.push(
                          `/dashboard/teacher/messages?open=${encodeURIComponent(id)}`
                        );
                      }
                    } catch (err) {
                      console.error("[StudentList] createConversation error", err);
                    } finally {
                      setSendingId((current) => (current === student.id ? null : current));
                    }
                  }}
                  disabled={sendingId === student.id}
                  className="px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-xl transition-all disabled:opacity-60"
                >
                  ✉️ {sendingId === student.id ? "Đang mở..." : "Nhắn tin"}
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <div className="text-sm text-gray-600 mb-1">Điểm trung bình</div>
                  <div className={`text-lg font-bold ${getPerformanceColor(student.averageGrade)}`}>
                    {student.averageGrade !== null ? student.averageGrade : "-"}
                  </div>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <div className="text-sm text-gray-600 mb-1">Chuyên cần</div>
                  <div className="text-lg font-bold text-blue-600">
                    {Math.round(student.submissionRate)}%
                  </div>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <div className="text-sm text-gray-600 mb-1">Hoàn thành bài tập</div>
                  <div className="text-lg font-bold text-purple-600">
                    {student.submittedCount}/{student.totalAssignments}
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