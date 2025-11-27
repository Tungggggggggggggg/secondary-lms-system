"use client";

import { useEffect } from "react";
import { useTeacherDashboard } from "@/hooks/use-teacher-dashboard";
import StatsGrid, { type StatItem } from "@/components/shared/StatsGrid";
import { Skeleton } from "@/components/ui/skeleton";

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
                    <Skeleton key={idx} className="h-[140px] rounded-2xl" />
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

    const items: StatItem[] = statsConfig.map((config) => {
        const rawValue =
            (stats[config.key as keyof typeof stats] as number | string | undefined) ?? 0;
        const rawChange = config.changeKey
            ? ((stats[config.changeKey as keyof typeof stats] as number | string | undefined) ?? 0)
            : null;

        const value = typeof rawValue === "number" ? rawValue.toString() : String(rawValue);
        const pillText =
            rawChange !== null
                ? `${config.changePrefix} ${rawChange}${config.changeSuffix}`
                : config.changePrefix;

        return {
            icon: config.icon,
            color: config.color,
            label: config.label,
            value,
            pillText,
            subtitle: config.changeLabel,
        };
    });

    return <StatsGrid items={items} />;
}
