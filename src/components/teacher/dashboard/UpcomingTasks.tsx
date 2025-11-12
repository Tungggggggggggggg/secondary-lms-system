"use client";

import { useEffect } from "react";
import { useTeacherDashboard } from "@/hooks/use-teacher-dashboard";

export default function UpcomingTasks() {
    const { tasks, isLoading, error, fetchTasks } = useTeacherDashboard();

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    // Helper function để format ngày
    const formatDate = (dateString: string | Date): string => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = date.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return "Hôm nay";
        if (diffDays === 1) return "Mai";
        if (diffDays === -1) return "Hôm qua";
        if (diffDays > 1 && diffDays <= 7) return `${diffDays} ngày nữa`;
        return date.toLocaleDateString('vi-VN');
    };

    // Helper function để lấy config màu theo priority
    const getPriorityConfig = (priority: string) => {
        switch (priority) {
            case 'URGENT':
                return {
                    borderColor: 'border-red-500',
                    bgColor: 'bg-red-50',
                    textColor: 'text-red-600',
                    badgeBg: 'bg-red-100',
                    label: 'KHẨN CẤP'
                };
            case 'IMPORTANT':
                return {
                    borderColor: 'border-yellow-500',
                    bgColor: 'bg-yellow-50',
                    textColor: 'text-yellow-600',
                    badgeBg: 'bg-yellow-100',
                    label: 'QUAN TRỌNG'
                };
            case 'NORMAL':
                return {
                    borderColor: 'border-blue-500',
                    bgColor: 'bg-blue-50',
                    textColor: 'text-blue-600',
                    badgeBg: 'bg-blue-100',
                    label: 'BÌNH THƯỜNG'
                };
            case 'COMPLETED':
                return {
                    borderColor: 'border-green-500',
                    bgColor: 'bg-green-50',
                    textColor: 'text-green-600',
                    badgeBg: 'bg-green-100',
                    label: 'ĐÃ HOÀN THÀNH'
                };
            default:
                return {
                    borderColor: 'border-gray-500',
                    bgColor: 'bg-gray-50',
                    textColor: 'text-gray-600',
                    badgeBg: 'bg-gray-100',
                    label: 'KHÁC'
                };
        }
    };

    // Loading state
    if (isLoading && !tasks) {
        return (
            <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-2xl font-extrabold text-gray-800 mb-6 flex items-center gap-2">
                    📋 Công việc sắp tới
                </h2>
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="border-l-4 border-gray-200 bg-gray-50 rounded-r-xl p-4 animate-pulse">
                            <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
                            <div className="h-5 w-40 bg-gray-200 rounded mb-1"></div>
                            <div className="h-4 w-32 bg-gray-200 rounded"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-2xl font-extrabold text-gray-800 mb-6 flex items-center gap-2">
                    📋 Công việc sắp tới
                </h2>
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-red-600 text-sm">Lỗi: {error}</p>
                </div>
            </div>
        );
    }

    // No data state
    if (!tasks || tasks.length === 0) {
        return (
            <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-2xl font-extrabold text-gray-800 mb-6 flex items-center gap-2">
                    📋 Công việc sắp tới
                </h2>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
                    <p className="text-gray-600">Không có công việc nào</p>
                    <p className="text-sm text-gray-500 mt-2">Bạn đã hoàn thành tất cả!</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-extrabold text-gray-800 mb-6 flex items-center gap-2">
                📋 Công việc sắp tới
            </h2>
            <div className="space-y-4">
                {tasks.map((task) => {
                    const config = getPriorityConfig(task.priority);
                    return (
                        <div
                            key={task.id}
                            className={`border-l-4 ${config.borderColor} ${config.bgColor} rounded-r-xl p-4`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className={`text-xs font-semibold ${config.textColor} ${config.badgeBg} px-2 py-1 rounded-full`}>
                                    {config.label}
                                </span>
                                <span className="text-xs text-gray-500">{formatDate(task.dueDate)}</span>
                            </div>
                            <h4 className="font-bold text-gray-800 mb-1">{task.title}</h4>
                            <p className="text-sm text-gray-600">{task.detail}</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}