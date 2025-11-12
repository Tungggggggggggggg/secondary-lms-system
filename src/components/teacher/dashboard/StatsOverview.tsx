"use client";

import { useEffect } from "react";
import { useTeacherDashboard } from "@/hooks/use-teacher-dashboard";

export default function StatsOverview() {
    const { stats, isLoading, error, fetchStats } = useTeacherDashboard();

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    // Cấu hình hiển thị cho từng stat
    const statsConfig = [
        {
            color: "from-blue-500 to-blue-600",
            icon: "👥",
            key: "totalStudents",
            label: "Học sinh",
            changeKey: "studentsChange",
            changeLabel: "so với tháng trước",
            changePrefix: "↑",
            changeSuffix: "%",
        },
        {
            color: "from-purple-500 to-purple-600",
            icon: "🏫",
            key: "totalClassrooms",
            label: "Lớp học",
            changeKey: "classroomsChange",
            changeLabel: "lớp mới tuần này",
            changePrefix: "↑",
            changeSuffix: "",
        },
        {
            color: "from-pink-500 to-pink-600",
            icon: "📚",
            key: "totalLessons",
            label: "Bài giảng",
            changeKey: "lessonsChange",
            changeLabel: "bài mới tháng này",
            changePrefix: "↑",
            changeSuffix: "",
        },
        {
            color: "from-yellow-500 to-orange-500",
            icon: "✍️",
            key: "pendingSubmissions",
            label: "Bài tập chờ",
            changeKey: null,
            changeLabel: "cần chấm điểm",
            changePrefix: "!",
            changeSuffix: "",
        },
    ];

    // Loading state
    if (isLoading && !stats) {
        return (
            <div className="grid md:grid-cols-4 gap-6 mb-8">
                {statsConfig.map((_, idx) => (
                    <div
                        key={idx}
                        className="bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl p-6 animate-pulse"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-14 h-14 bg-white/20 rounded-xl"></div>
                            <div className="text-right">
                                <div className="h-8 w-16 bg-white/20 rounded mb-2"></div>
                                <div className="h-4 w-20 bg-white/20 rounded"></div>
                            </div>
                        </div>
                        <div className="h-6 w-32 bg-white/20 rounded"></div>
                    </div>
                ))}
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-8">
                <p className="text-red-600">Lỗi khi tải thống kê: {error}</p>
            </div>
        );
    }

    // No data state
    if (!stats) {
        return (
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 mb-8">
                <p className="text-gray-600">Không có dữ liệu thống kê</p>
            </div>
        );
    }

    return (
        <div className="grid md:grid-cols-4 gap-6 mb-8">
            {statsConfig.map((config, idx) => {
                const value = stats[config.key as keyof typeof stats] || 0;
                const changeValue = config.changeKey 
                    ? stats[config.changeKey as keyof typeof stats] || 0
                    : null;
                
                const changeDisplay = changeValue !== null
                    ? `${config.changePrefix} ${changeValue}${config.changeSuffix}`
                    : config.changePrefix;

                return (
                    <div
                        key={idx}
                        className={`bg-gradient-to-br ${config.color} rounded-2xl p-6 text-white hover-lift`}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center text-2xl">
                                {config.icon}
                            </div>
                            <div className="text-right">
                                <div className="text-3xl font-extrabold">
                                    {value}
                                </div>
                                <div className="text-white/80 text-sm">
                                    {config.label}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <span className="bg-white/20 px-2 py-1 rounded-full">
                                {changeDisplay}
                            </span>
                            <span className="text-white/80">{config.changeLabel}</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
