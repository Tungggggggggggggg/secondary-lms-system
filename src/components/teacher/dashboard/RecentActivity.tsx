"use client";

import { useEffect } from "react";
import { useTeacherDashboard } from "@/hooks/use-teacher-dashboard";

export default function RecentActivity() {
    const { activities, isLoading, error, fetchActivities } = useTeacherDashboard();

    useEffect(() => {
        fetchActivities();
    }, [fetchActivities]);

    // Helper function để lấy config theo actorType
    const getActorConfig = (actorType: string) => {
        switch (actorType) {
            case 'STUDENT':
                return {
                    color: 'from-blue-400 to-blue-500',
                    short: 'HS'
                };
            case 'PARENT':
                return {
                    color: 'from-purple-400 to-purple-500',
                    short: 'PH'
                };
            case 'TEACHER':
                return {
                    color: 'from-green-400 to-green-500',
                    short: 'GV'
                };
            default:
                return {
                    color: 'from-gray-400 to-gray-500',
                    short: '?'
                };
        }
    };

    // Helper function để lấy icon theo type
    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'SUBMISSION':
                return '📝';
            case 'JOIN':
                return '👋';
            case 'COMMENT':
                return '💬';
            case 'MESSAGE':
                return '✉️';
            case 'LIKE':
                return '⭐';
            default:
                return '🔔';
        }
    };

    // Loading state
    if (isLoading && !activities) {
        return (
            <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-2xl font-extrabold text-gray-800 mb-6 flex items-center gap-2">
                    🔔 Hoạt động gần đây
                </h2>
                <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex gap-3 animate-pulse">
                            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                            <div className="flex-1">
                                <div className="h-4 w-40 bg-gray-200 rounded mb-1"></div>
                                <div className="h-3 w-32 bg-gray-200 rounded"></div>
                            </div>
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
                    🔔 Hoạt động gần đây
                </h2>
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-red-600 text-sm">Lỗi: {error}</p>
                </div>
            </div>
        );
    }

    // No data state
    if (!activities || activities.length === 0) {
        return (
            <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-2xl font-extrabold text-gray-800 mb-6 flex items-center gap-2">
                    🔔 Hoạt động gần đây
                </h2>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
                    <p className="text-gray-600">Chưa có hoạt động nào</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-extrabold text-gray-800 mb-6 flex items-center gap-2">
                🔔 Hoạt động gần đây
            </h2>
            <div className="space-y-4">
                {activities.map((activity) => {
                    const config = getActorConfig(activity.actorType);
                    const icon = getTypeIcon(activity.type);
                    
                    return (
                        <div key={activity.id} className="flex gap-3">
                            <div className={`w-10 h-10 bg-gradient-to-r ${config.color} rounded-full flex items-center justify-center text-white font-bold text-xs`}>
                                {config.short}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm text-gray-800">
                                    {icon} <span className="font-semibold">{activity.actorName}</span> {activity.action}
                                </p>
                                <p className="text-xs text-gray-500">{activity.detail}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}