"use client";

import { useRouter } from "next/navigation";
import MessageStudentButton from "@/components/teacher/students/MessageStudentButton";
import StudentStatusBadge from "@/components/teacher/students/StudentStatusBadge";

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
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center text-2xl text-white font-bold">
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
                    <StudentStatusBadge status={student.status} />
                  </div>
                </div>
                <MessageStudentButton
                  studentId={student.id}
                  classroomId={student.classroomId}
                />
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
                  <div className="text-lg font-bold text-blue-700">
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
