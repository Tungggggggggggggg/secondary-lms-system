"use client";

import { useEffect } from "react";
import { useClassroom } from "@/hooks/use-classroom";
import Link from "next/link";

export default function MyClasses() {
  const { classrooms, isLoading, error, fetchClassrooms } = useClassroom();

  // Tự động fetch khi component mount
  useEffect(() => {
    fetchClassrooms();
  }, [fetchClassrooms]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-extrabold text-gray-800 flex items-center gap-2">
            🏫 Lớp học của tôi
          </h2>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-24 bg-gray-200 rounded-xl"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-extrabold text-gray-800 flex items-center gap-2">
            🏫 Lớp học của tôi
          </h2>
        </div>
        <div className="text-red-500 text-center py-4">
          Có lỗi xảy ra: {error}
        </div>
      </div>
    );
  }

  if (!classrooms || classrooms.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-extrabold text-gray-800 flex items-center gap-2">
            🏫 Lớp học của tôi
          </h2>
          <Link
            href="/dashboard/student/classes/join"
            className="text-sm font-semibold text-purple-600 hover:text-purple-700"
          >
            Tham gia lớp mới →
          </Link>
        </div>
        <div className="text-center py-12 text-gray-500">
          <p className="mb-4">Bạn chưa tham gia lớp học nào.</p>
          <Link
            href="/dashboard/student/classes/join"
            className="inline-block px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700"
          >
            Tham gia lớp học đầu tiên
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-extrabold text-gray-800 flex items-center gap-2">
          🏫 Lớp học của tôi
        </h2>
        <Link
          href="/dashboard/student/classes/join"
          className="text-sm font-semibold text-purple-600 hover:text-purple-700"
        >
          Tham gia lớp mới →
        </Link>
      </div>

      <div className="space-y-4">
        {classrooms.map((classroom) => (
          <Link
            key={classroom.id}
            href={`/dashboard/student/classes/${classroom.id}`}
            className="gradient-border rounded-xl p-5 hover-lift cursor-pointer block"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-purple-500 rounded-xl flex items-center justify-center text-xl">
                  {classroom.icon}
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">{classroom.name}</h3>
                  <p className="text-sm text-gray-600">
                    {classroom.teacher?.fullname || "Giáo viên"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-semibold mb-1">
                  Đang học
                </div>
                <div className="text-xs text-gray-500">
                  {classroom._count?.students || 0} học sinh
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>📖 Mã lớp: {classroom.code}</span>
              {classroom.joinedAt && (
                <span>
                  🕐 Tham gia: {new Date(classroom.joinedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
