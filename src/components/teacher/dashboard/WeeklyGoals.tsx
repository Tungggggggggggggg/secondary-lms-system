"use client";

import { useEffect } from "react";
import { useTeacherDashboard } from "@/hooks/use-teacher-dashboard";

export default function WeeklyGoals() {
    const { goals, isLoading, error, fetchGoals } = useTeacherDashboard();

    useEffect(() => {
        fetchGoals();
    }, [fetchGoals]);

    // Loading state
    if (isLoading && !goals) {
        return (
            <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-6 text-white">
                <h2 className="text-xl font-extrabold mb-4 flex items-center gap-2">🎯 Mục tiêu tuần này</h2>
                <div className="space-y-4 animate-pulse">
                    {[1, 2, 3].map((i) => (
                        <div key={i}>
                            <div className="flex items-center justify-between mb-2">
                                <div className="h-4 w-24 bg-white/20 rounded"></div>
                                <div className="h-4 w-12 bg-white/20 rounded"></div>
                            </div>
                            <div className="h-2 bg-white/20 rounded-full"></div>
                        </div>
                    ))}
                    <div className="bg-white/10 rounded-xl p-3 mt-4">
                        <div className="h-6 w-32 bg-white/20 rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-6 text-white">
                <h2 className="text-xl font-extrabold mb-4 flex items-center gap-2">🎯 Mục tiêu tuần này</h2>
                <div className="bg-white/10 rounded-xl p-4">
                    <p className="text-sm">Lỗi: {error}</p>
                </div>
            </div>
        );
    }

    // No data state
    if (!goals || !goals.goals || goals.goals.length === 0) {
        return (
            <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-6 text-white">
                <h2 className="text-xl font-extrabold mb-4 flex items-center gap-2">🎯 Mục tiêu tuần này</h2>
                <div className="bg-white/10 rounded-xl p-8 text-center">
                    <p className="text-sm">Chưa có mục tiêu nào</p>
                </div>
            </div>
        );
    }

    // Helper function để lấy emoji theo category
    const getCategoryEmoji = (category: string) => {
        switch (category) {
            case 'GRADING':
                return '✍️';
            case 'LESSON':
                return '📚';
            case 'COMMUNICATION':
                return '💬';
            default:
                return '📋';
        }
    };

    return (
        <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-6 text-white">
            <h2 className="text-xl font-extrabold mb-4 flex items-center gap-2">🎯 Mục tiêu tuần này</h2>
            <div className="space-y-4">
                {goals.goals.map((goal) => {
                    const percent = goal.total > 0 ? Math.round((goal.completed / goal.total) * 100) : 0;
                    const emoji = getCategoryEmoji(goal.category);
                    
                    return (
                        <div key={goal.id}>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm">{emoji} {goal.title}</span>
                                <span className="text-sm font-bold">
                                    {goal.completed}/{goal.total}
                                </span>
                            </div>
                            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-white rounded-full transition-all duration-500" 
                                    style={{ width: `${Math.min(percent, 100)}%` }}
                                ></div>
                            </div>
                        </div>
                    );
                })}
                <div className="bg-white/10 rounded-xl p-3 mt-4 flex items-center gap-2">
                    <span className="text-2xl">🔥</span>
                    <div>
                        <div className="font-bold">Streak {goals.streak} ngày!</div>
                        <div className="text-xs text-white/80">
                            {goals.streak > 0 ? 'Tiếp tục phát huy nhé!' : 'Bắt đầu streak mới hôm nay!'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}