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
            <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-extrabold text-gray-800 flex items-center gap-2">
                        🏫 Lớp học gần đây
                    </h2>
                </div>
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="border rounded-xl p-5 animate-pulse">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
                                <div className="flex-1">
                                    <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
                                    <div className="h-3 w-24 bg-gray-200 rounded"></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-lg p-6">
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
                            className="gradient-border rounded-xl p-5 hover-lift cursor-pointer"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`w-12 h-12 bg-gradient-to-r ${getColorForIcon(classroom.icon)} rounded-xl flex items-center justify-center text-xl`}
                                    >
                                        {classroom.icon}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-800">{classroom.name}</h3>
                                        <p className="text-sm text-gray-600">
                                            {classroom._count?.students ?? 0} / {classroom.maxStudents} học sinh
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={`text-xs px-3 py-1 rounded-full font-semibold mb-1 ${
                                        classroom.isActive 
                                            ? "bg-green-100 text-green-700" 
                                            : "bg-gray-100 text-gray-700"
                                    }`}>
                                        {classroom.isActive ? "Đang hoạt động" : "Đã lưu trữ"}
                                    </div>
                                    <div className="text-xs text-gray-500">Mã: {classroom.code}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                                <span>📅 {formatDate(classroom.createdAt)}</span>
                                <span>📝 {classroom.description || "Không có mô tả"}</span>
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
