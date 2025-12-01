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
      <div className="bg-white/90 rounded-3xl border border-slate-100 shadow-[0_10px_30px_rgba(15,23,42,0.06)] p-6 sm:p-7">
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
      <div className="bg-white/90 rounded-3xl border border-slate-100 shadow-[0_10px_30px_rgba(15,23,42,0.06)] p-6 sm:p-7">
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
      <div className="bg-white/90 rounded-3xl border border-slate-100 shadow-[0_10px_30px_rgba(15,23,42,0.06)] p-6 sm:p-7">
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
    <div className="bg-white/90 rounded-3xl border border-slate-100 shadow-[0_10px_30px_rgba(15,23,42,0.06)] p-6 sm:p-7">
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
            className="group block"
          >
            <div className="flex flex-col sm:flex-row items-stretch gap-4 rounded-2xl bg-white/95 border border-slate-100 shadow-[0_8px_24px_rgba(15,23,42,0.06)] px-5 py-4 sm:px-6 sm:py-5 transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(15,23,42,0.12)]">
              <div className="flex items-center sm:items-start gap-3 sm:gap-4 flex-shrink-0">
                <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-400 via-sky-400 to-emerald-300 text-2xl sm:text-3xl shadow-sm">
                  {classroom.icon}
                </div>
              </div>

              <div className="flex flex-1 flex-col justify-between gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="text-base sm:text-lg font-semibold text-slate-900 line-clamp-2">
                      {classroom.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500">
                      GV: {classroom.teacher?.fullname || "Giáo viên"}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700 border border-emerald-100">
                      Đang học
                    </span>
                    <div className="text-[11px] text-slate-500">
                      {classroom._count?.students || 0} học sinh
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 text-[11px] sm:text-xs text-slate-600">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 border border-slate-200">
                      <span className="text-xs">#</span>
                      <span>Mã lớp: {classroom.code}</span>
                    </span>
                    {classroom.joinedAt && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 border border-slate-200">
                        <span className="text-xs">�</span>
                        <span>
                          Tham gia: {new Date(classroom.joinedAt).toLocaleDateString("vi-VN")}
                        </span>
                      </span>
                    )}
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-indigo-600 group-hover:text-indigo-700">
                    Vào lớp
                    <span aria-hidden="true">→</span>
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
