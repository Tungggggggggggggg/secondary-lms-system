"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useClassroom } from "@/hooks/use-classroom";
import { ClassroomResponse } from "@/types/classroom";

export default function ClassesPage() {
    const router = useRouter();
    const { classrooms, isLoading, error, fetchClassrooms } = useClassroom();
    const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name" | "students">("newest");
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        fetchClassrooms();
    }, [fetchClassrooms]);

    // Filter và sort classrooms
    const filteredAndSortedClassrooms = useMemo(() => {
        if (!classrooms) return [];

        let filtered = [...classrooms];

        // Filter theo search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (c) =>
                    c.name.toLowerCase().includes(query) ||
                    c.code.toLowerCase().includes(query) ||
                    c.teacher?.fullname?.toLowerCase().includes(query) ||
                    c.description?.toLowerCase().includes(query)
            );
        }

        // Sort
        switch (sortBy) {
            case "name":
                filtered.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case "students":
                filtered.sort(
                    (a, b) => (b._count?.students ?? 0) - (a._count?.students ?? 0)
                );
                break;
            case "oldest":
                filtered.sort(
                    (a, b) =>
                        new Date(a.joinedAt || a.createdAt).getTime() - new Date(b.joinedAt || b.createdAt).getTime()
                );
                break;
            case "newest":
            default:
                filtered.sort(
                    (a, b) =>
                        new Date(b.joinedAt || b.createdAt).getTime() - new Date(a.joinedAt || a.createdAt).getTime()
                );
                break;
        }

        return filtered;
    }, [classrooms, sortBy, searchQuery]);

    if (isLoading) {
        return (
            <div className="p-8">
                <div className="grid md:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="bg-white rounded-2xl shadow-lg p-6 animate-pulse"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-14 h-14 bg-gray-200 rounded-xl"></div>
                                <div className="flex-1">
                                    <div className="h-4 w-2/3 bg-gray-200 rounded mb-2"></div>
                                    <div className="h-3 w-1/2 bg-gray-200 rounded"></div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="h-3 w-full bg-gray-200 rounded"></div>
                                <div className="h-3 w-4/5 bg-gray-200 rounded"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8">
                <div className="text-red-600 font-semibold p-4 bg-red-50 rounded-xl mb-4">
                    Đã xảy ra lỗi khi tải danh sách lớp học: {error}
                </div>
            </div>
        );
    }

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-800 mb-2">Lớp học của tôi</h1>
                    <p className="text-gray-600">Các lớp học bạn đã tham gia</p>
                </div>
                <button
                    onClick={() => router.push("/dashboard/student/classes/join")}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all flex items-center gap-2"
                >
                    <span>➕</span>
                    <span>Tham gia lớp mới</span>
                </button>
            </div>

            {/* Filter & Search */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <select
                        value={sortBy}
                        onChange={(e) =>
                            setSortBy(
                                e.target.value as "newest" | "oldest" | "name" | "students"
                            )
                        }
                        className="px-4 py-2 bg-white rounded-xl border border-gray-200"
                    >
                        <option value="newest">Mới nhất</option>
                        <option value="oldest">Cũ nhất</option>
                        <option value="name">Theo tên</option>
                        <option value="students">Số học sinh</option>
                    </select>
                </div>
                <div className="relative">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tìm kiếm lớp học..."
                        className="pl-10 pr-4 py-2 bg-white rounded-xl border border-gray-200 w-64"
                    />
                    <span className="absolute left-3 top-2.5">🔍</span>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                {filteredAndSortedClassrooms.length > 0 ? (
                    filteredAndSortedClassrooms.map((classroom: ClassroomResponse) => (
                        <div
                            key={classroom.id}
                            onClick={() => router.push(`/dashboard/student/classes/${classroom.id}`)}
                            className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all cursor-pointer hover:-translate-y-1"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-14 h-14 bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-xl flex items-center justify-center text-2xl">
                                    {classroom.icon}
                                </div>
                                <div className="bg-green-100 text-green-600 px-3 py-1 rounded-full text-sm font-medium">
                                    Đang tham gia
                                </div>
                            </div>

                            <h3 className="text-xl font-bold text-gray-800 mb-2">{classroom.name}</h3>
                            <div className="text-sm text-gray-600 mb-4">
                                GV: {classroom.teacher?.fullname || "Giáo viên"}
                            </div>
                            <div className="flex items-center justify-between text-sm text-gray-600">
                                <span>Mã lớp: {classroom.code}</span>
                                <span>{classroom._count?.students ?? 0} học sinh</span>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-3 text-center text-gray-500 py-8">
                        {classrooms && classrooms.length > 0
                            ? "Không tìm thấy lớp học nào phù hợp với bộ lọc."
                            : "Không có lớp học nào. "}
                        {(!classrooms || classrooms.length === 0) && (
                            <button
                                onClick={() => router.push("/dashboard/student/classes/join")}
                                className="text-purple-600 hover:text-purple-700 underline"
                            >
                                Tham gia lớp học đầu tiên
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
