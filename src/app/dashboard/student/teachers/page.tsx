"use client";

import { useState } from "react";
import useSWR from "swr";
import { Mail, MessageSquare, Users, BookOpen } from "lucide-react";
import Breadcrumb, { BreadcrumbItem } from "@/components/ui/breadcrumb";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Teacher {
  id: string;
  email: string;
  fullname: string;
  classrooms: Array<{
    id: string;
    name: string;
    code: string;
    icon: string;
  }>;
}

export default function StudentTeachersPage() {
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);

  const { data, error, isLoading } = useSWR<{
    success?: boolean;
    data?: Teacher[];
  }>("/api/students/teachers", fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  const teachers = data?.data || [];

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "Dashboard", href: "/dashboard/student/dashboard" },
    { label: "Liên hệ Giáo viên", href: "/dashboard/student/teachers" },
  ];

  const handleContactTeacher = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setShowContactModal(true);
  };

  const handleSendEmail = (email: string) => {
    window.location.href = `mailto:${email}?subject=Liên hệ từ học sinh`;
  };

  const handleCloseModal = () => {
    setShowContactModal(false);
    setSelectedTeacher(null);
  };

  const getTeacherIcon = (index: number) => {
    const icons = ["👨‍🏫", "👩‍🏫", "🧑‍🏫"];
    return icons[index % icons.length];
  };

  const getTeacherBg = (index: number) => {
    const bgs = ["bg-yellow-100", "bg-teal-100", "bg-blue-100", "bg-purple-100", "bg-pink-100"];
    return bgs[index % bgs.length];
  };

  return (
    <>
      <Breadcrumb items={breadcrumbItems} className="mb-4" />
      
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">💬 Liên hệ Giáo viên</h1>
        <p className="text-gray-600">Danh sách giáo viên từ các lớp học bạn đã tham gia</p>
      </div>

      {isLoading && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-2xl shadow-lg p-6 animate-pulse">
              <div className="h-16 bg-gray-200 rounded mb-4"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <p className="text-red-600 font-semibold">
            {error ? `Có lỗi xảy ra: ${error}` : "Không thể tải dữ liệu"}
          </p>
        </div>
      )}

      {!isLoading && !error && teachers.length === 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Chưa có giáo viên nào</h3>
          <p className="text-gray-500 mb-6">Bạn cần tham gia lớp học trước để có thể liên hệ với giáo viên</p>
          <a
            href="/dashboard/student/classes/join"
            className="inline-block px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
          >
            Tham gia lớp học
          </a>
        </div>
      )}

      {!isLoading && !error && teachers.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teachers.map((teacher, index) => (
            <div
              key={teacher.id}
              className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all"
            >
              <div className="flex items-center gap-4 mb-4">
                <div
                  className={`w-16 h-16 ${getTeacherBg(index)} rounded-full flex items-center justify-center text-2xl flex-shrink-0`}
                >
                  {getTeacherIcon(index)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg text-gray-900 truncate">{teacher.fullname}</h3>
                  <p className="text-sm text-gray-500 truncate">{teacher.email}</p>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <BookOpen className="w-4 h-4" />
                  <span className="font-semibold">{teacher.classrooms.length} lớp học</span>
                </div>
                <div className="space-y-1">
                  {teacher.classrooms.map((classroom) => (
                    <div
                      key={classroom.id}
                      className="text-xs bg-gray-50 rounded-lg px-3 py-2 text-gray-700"
                    >
                      <span className="font-medium">{classroom.name}</span>
                      <span className="text-gray-500 ml-2">({classroom.code})</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleSendEmail(teacher.email)}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold"
                >
                  <Mail className="w-4 h-4" />
                  Email
                </button>
                <button
                  onClick={() => handleContactTeacher(teacher)}
                  className="flex-1 flex items-center justify-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-semibold"
                >
                  <MessageSquare className="w-4 h-4" />
                  Liên hệ
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Contact Modal */}
      {showContactModal && selectedTeacher && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">
                Liên hệ {selectedTeacher.fullname}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="mb-4 space-y-3">
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-1">Email:</p>
                <p className="text-sm text-gray-600">{selectedTeacher.email}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-1">Lớp học:</p>
                <div className="space-y-1">
                  {selectedTeacher.classrooms.map((classroom) => (
                    <div
                      key={classroom.id}
                      className="text-xs bg-gray-50 rounded-lg px-3 py-2 text-gray-700"
                    >
                      {classroom.name} ({classroom.code})
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handleSendEmail(selectedTeacher.email)}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Mail className="w-4 h-4" />
                Mở Email Client
              </button>
              <button
                onClick={handleCloseModal}
                className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

