"use client";

import { useState } from "react";
import useSWR from "swr";
import { Mail, MessageSquare } from "lucide-react";

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

export default function TeacherContacts() {
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

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-2xl font-extrabold text-gray-800 mb-6 flex items-center gap-2">
          💬 Liên hệ Giáo viên
        </h2>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-20 bg-gray-200 rounded-xl"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data?.success) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-2xl font-extrabold text-gray-800 mb-6 flex items-center gap-2">
          💬 Liên hệ Giáo viên
        </h2>
        <div className="text-red-500 text-center py-4">
          {error ? `Có lỗi xảy ra: ${error}` : "Không thể tải dữ liệu"}
        </div>
      </div>
    );
  }

  if (teachers.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-2xl font-extrabold text-gray-800 mb-6 flex items-center gap-2">
          💬 Liên hệ Giáo viên
        </h2>
        <div className="text-center py-8 text-gray-500">
          <p>Chưa có giáo viên nào để liên hệ</p>
          <p className="text-sm mt-2">Bạn cần tham gia lớp học trước</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-2xl font-extrabold text-gray-800 mb-6 flex items-center gap-2">
          💬 Liên hệ Giáo viên
        </h2>

        <div className="space-y-3">
          {teachers.map((teacher, index) => (
            <div
              key={teacher.id}
              className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className={`w-10 h-10 ${getTeacherBg(index)} rounded-full flex items-center justify-center text-lg`}
                >
                  {getTeacherIcon(index)}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{teacher.fullname}</h3>
                  <p className="text-xs text-gray-500">
                    {teacher.classrooms.length} lớp học: {teacher.classrooms.map((c) => c.name).join(", ")}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleSendEmail(teacher.email)}
                  className="flex-1 flex items-center justify-center gap-2 text-xs text-blue-600 hover:text-blue-700 font-medium bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  Gửi Email
                </button>
                <button
                  onClick={() => handleContactTeacher(teacher)}
                  className="flex-1 flex items-center justify-center gap-2 text-xs text-purple-600 hover:text-purple-700 font-medium bg-purple-50 hover:bg-purple-100 px-3 py-2 rounded-lg transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  Liên hệ
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

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

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Email:</strong> {selectedTeacher.email}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Lớp học:</strong>{" "}
                {selectedTeacher.classrooms.map((c) => c.name).join(", ")}
              </p>
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

