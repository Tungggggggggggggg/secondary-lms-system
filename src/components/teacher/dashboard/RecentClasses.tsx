"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useClassroom } from "@/hooks/use-classroom";
import { ClassroomResponse } from "@/types/classroom";

export default function RecentClasses() {
    const router = useRouter();
    const { classrooms, isLoading, fetchClassrooms } = useClassroom();

    useEffect(() => {
        fetchClassrooms();
    }, [fetchClassrooms]);

    // Lấy 3 lớp học mới nhất, sắp xếp theo createdAt (mới nhất trước)
    const recentClasses = useMemo(() => {
        if (!classrooms || classrooms.length === 0) return [];
        
        const sorted = [...classrooms].sort((a, b) => {
            const dateA = new Date(a.createdAt).getTime();
            const dateB = new Date(b.createdAt).getTime();
            return dateB - dateA; // Mới nhất trước
        });
        
        return sorted.slice(0, 3); // Lấy 3 lớp đầu tiên
    }, [classrooms]);

    // Helper function để format ngày tháng
    const formatDate = (dateString: string | Date) => {
        const date = new Date(dateString);
        const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
        const day = date.getDate();
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        return ` ${day}/${month}/${year}`;
    };

    // Helper function để lấy màu gradient dựa trên icon
    const getColorForIcon = (icon: string) => {
        if (icon.includes('📜') || icon.includes('📚')) return "from-yellow-400 to-yellow-500";
        if (icon.includes('🗺️')) return "from-emerald-400 to-emerald-500";
        if (icon.includes('🗣️')) return "from-blue-400 to-blue-500";
        if (icon.includes('🧮')) return "from-purple-400 to-purple-500";
        if (icon.includes('🔬')) return "from-green-400 to-green-500";
        if (icon.includes('🎨')) return "from-pink-400 to-pink-500";
        return "from-gray-400 to-gray-500";
    };

    if (isLoading) {
        return (
            <div className="bg-white/90 rounded-3xl border border-slate-100 shadow-[0_10px_30px_rgba(15,23,42,0.06)] p-6 sm:p-7">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-extrabold text-gray-800 flex items-center gap-2">
                        🏫 Lớp học gần đây
                    </h2>
                </div>
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-24 rounded-2xl bg-slate-100/80 animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white/90 rounded-3xl border border-slate-100 shadow-[0_10px_30px_rgba(15,23,42,0.06)] p-6 sm:p-7">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-extrabold text-gray-800 flex items-center gap-2">
                    🏫 Lớp học gần đây
                </h2>
                <a
                    href="/dashboard/teacher/classrooms"
                    className="text-sm font-semibold text-purple-600 hover:text-purple-700"
                >
                    Xem tất cả →
                </a>
            </div>
            <div className="space-y-4">
                {recentClasses.length > 0 ? (
                    recentClasses.map((classroom: ClassroomResponse) => (
                        <div
                            key={classroom.id}
                            onClick={() => router.push(`/dashboard/teacher/classrooms/${classroom.id}`)}
                            className="group cursor-pointer"
                        >
                            <div className="flex flex-col sm:flex-row items-stretch gap-4 rounded-2xl bg-white/95 border border-slate-100 shadow-[0_8px_24px_rgba(15,23,42,0.06)] px-5 py-4 sm:px-6 sm:py-5 transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(15,23,42,0.12)]">
                                <div className="flex items-center sm:items-start gap-3 sm:gap-4 flex-shrink-0">
                                    <div
                                        className={`flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${getColorForIcon(classroom.icon)} text-2xl sm:text-3xl text-white shadow-sm`}
                                    >
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
                                                {classroom._count?.students ?? 0}/{classroom.maxStudents} học sinh
                                            </p>
                                        </div>
                                        <div className="text-right space-y-1">
                                            <span
                                                className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold border ${
                                                    classroom.isActive
                                                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                                        : "bg-slate-50 text-slate-600 border-slate-200"
                                                }`}
                                            >
                                                {classroom.isActive ? "Đang hoạt động" : "Đã lưu trữ"}
                                            </span>
                                            <div className="text-[11px] text-slate-500">Mã: {classroom.code}</div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-3 text-[11px] sm:text-xs text-slate-600">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 border border-slate-200">
                                                <span className="text-xs">📅</span>
                                                <span>{formatDate(classroom.createdAt)}</span>
                                            </span>
                                            {classroom.description && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 border border-slate-200 max-w-xs truncate">
                                                    <span className="text-xs">📝</span>
                                                    <span className="truncate">{classroom.description}</span>
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
                        </div>
                    ))
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        <p className="mb-4">Chưa có lớp học nào</p>
                        <a
                            href="/dashboard/teacher/classrooms/new"
                            className="text-sm font-semibold text-purple-600 hover:text-purple-700 inline-block"
                        >
                            Tạo lớp học đầu tiên →
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}
