"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAssignments, type AssignmentT } from "@/hooks/use-assignments";
import { useToast } from "@/hooks/use-toast";
import ClassroomBadges from "./ClassroomBadges";

export default function AssignmentList({
    items,
    loading: loadingProp,
    error: errorProp,
    onRefresh,
}: {
    items?: AssignmentT[];
    loading?: boolean;
    error?: string | null;
    onRefresh?: () => void;
}) {
    const router = useRouter();
    const {
        assignments: hookAssignments,
        loading: hookLoading,
        error: hookError,
        refresh,
    } = useAssignments();
    const assignments = items ?? hookAssignments;
    const loading = loadingProp ?? hookLoading;
    const error = errorProp ?? hookError;
    const doRefresh = onRefresh ?? refresh;
    const { toast } = useToast(); // Hook toast
    const [confirmAssignmentId, setConfirmAssignmentId] = useState<string | null>(null);

    // Trigger toast when error changes (must be before any early returns to keep hook order stable)
    useEffect(() => {
        if (error) {
            console.error("[AssignmentList] Lỗi:", error);
            toast({
                title: "Lỗi tải danh sách bài tập",
                description: error,
                variant: "destructive",
            });
        }
    }, [error, toast]);

    // Helper lấy màu sắc status (không cần loại bài)
    const getStatusColor = (status: string) => {
        switch (status) {
            case "Đang diễn ra":
            case "IN_PROGRESS":
                return "bg-green-100 text-green-600";
            case "Đã hết hạn":
            case "COMPLETED":
                return "bg-red-100 text-red-600";
            default:
                return "bg-gray-100 text-gray-600";
        }
    };

    // Thêm Chip hiển thị loại bài tập
    function AssignmentTypeChip({ type }: { type?: string }) {
        if (!type) return null;
        const PROPS = {
            ESSAY: {
                className:
                    "bg-indigo-50 text-indigo-700 border border-indigo-200",
                icon: "📝",
                label: "Tự luận",
            },
            QUIZ: {
                className: "bg-pink-50 text-pink-700 border border-pink-200",
                icon: "❓",
                label: "Trắc nghiệm",
            },
        };
        const props = PROPS[type as keyof typeof PROPS] ?? PROPS.ESSAY;
        return (
            <span
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${props.className}`}
            >
                <span>{props.icon}</span>
                <span>{props.label}</span>
            </span>
        );
    }

    // Hiển thị trạng thái loading/error rõ ràng
    if (loading) {
        return (
            <div className="text-center text-sm py-8 text-gray-500 animate-pulse">
                Đang tải danh sách bài tập...
            </div>
        );
    }
    if (error) {
        return (
            <div className="text-center text-red-500 py-8">
                Đã xảy ra lỗi khi lấy danh sách bài tập: {error}
                <button
                    className="mt-4 px-4 py-2 bg-gray-200 rounded-lg"
                    onClick={doRefresh}
                >
                    Thử lại
                </button>
            </div>
        );
    }

    if (assignments.length === 0) {
        return (
            <div className="text-center text-gray-400 py-10 italic">
                Hiện chưa có bài tập nào. Hãy tạo bài tập mới cho học sinh của
                bạn.
            </div>
        );
    }

    // Render assignments động từ API
    return (
        <div className="space-y-4">
            {assignments.map((assignment) => (
                <div
                    key={assignment.id}
                    className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer"
                    onClick={() =>
                        router.push(
                            `/dashboard/teacher/assignments/${assignment.id}`
                        )
                    }
                >
                    {/* Thêm chip loại bài tập hiển thị bên phải tiêu đề */}
                    <div className="flex items-start justify-between">
                        <div className="space-y-1">
                            <h3 className="text-xl font-bold text-gray-800">
                                {assignment.title}
                            </h3>
                        </div>
                        <div className="flex items-center gap-3">
                            <AssignmentTypeChip type={assignment.type} />
                            <span
                                className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                                    "IN_PROGRESS"
                                )}`}
                            >
                                {/* Backend nên trả về trạng thái assignment, tạm thời mặc định */}
                                Đang diễn ra
                            </span>
                        </div>
                    </div>

                    {/* Classroom badges */}
                    <div className="mt-3">
                        <ClassroomBadges assignmentId={assignment.id} maxVisible={3} />
                    </div>

                    <div className="mt-4 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1">
                                <span className="text-gray-600">📅 Hạn nộp:</span>
                                <span className="font-medium text-gray-800">
                                    {(() => {
                                        const effective = assignment.type === "QUIZ"
                                            ? (assignment as any).lockAt || assignment.dueDate
                                            : assignment.dueDate;
                                        return effective
                                            ? new Date(effective as any).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
                                            : "Không rõ";
                                    })()}
                                </span>
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="text-gray-600">
                                    📥 Đã nộp:
                                </span>
                                <span className="font-medium text-gray-800">
                                    {assignment._count?.submissions ?? 0}
                                </span>
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            {assignment.type === "QUIZ" && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        router.push(
                                            `/dashboard/teacher/exams/monitor?assignmentId=${assignment.id}`
                                        );
                                    }}
                                    className="px-4 py-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                >
                                    👁 Giám sát thi
                                </button>
                            )}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(
                                        `/dashboard/teacher/assignments/${assignment.id}/edit`
                                    );
                                }}
                                className="px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-xl transition-all"
                            >
                                ✏️ Chỉnh sửa
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(
                                        `/dashboard/teacher/assignments/${assignment.id}/submissions`
                                    );
                                }}
                                className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                            >
                                Xem bài nộp
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmAssignmentId(assignment.id);
                                }}
                                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl transition-all"
                            >
                                🗑️ Xoá
                            </button>
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-4">
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full"
                                style={{
                                    width: `${
                                        assignment._count?.submissions &&
                                        assignment._count?.submissions > 0
                                            ? 100
                                            : 0
                                    }%`,
                                }}
                            />
                        </div>
                    </div>
                </div>
            ))}
            {/* Modal xác nhận xoá */}
            {confirmAssignmentId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmAssignmentId(null)} />
                    <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-md border">
                        <h3 className="text-lg font-semibold mb-2">Xác nhận xoá bài tập</h3>
                        <p className="text-sm text-gray-600 mb-4">Hành động này không thể hoàn tác. Bạn chắc chắn muốn xoá?</p>
                        <div className="flex justify-end gap-3">
                            <button
                                className="px-4 py-2 rounded-xl border text-gray-700 hover:bg-gray-50"
                                onClick={() => setConfirmAssignmentId(null)}
                            >
                                Huỷ
                            </button>
                            <button
                                className="px-4 py-2 rounded-xl bg-red-600 text-white hover:brightness-110"
                                onClick={async () => {
                                    const id = confirmAssignmentId;
                                    try {
                                        const res = await fetch(`/api/assignments/${id}`, { method: "DELETE" });
                                        const data = await res.json().catch(() => ({}));
                                        if (!res.ok) {
                                            toast({ title: "Xoá bài tập thất bại", description: (data as any)?.message, variant: "destructive" });
                                            return;
                                        }
                                        toast({ title: "Đã xoá bài tập", variant: "success" });
                                        setConfirmAssignmentId(null);
                                        doRefresh();
                                    } catch (err) {
                                        console.error("[DELETE ASSIGNMENT]", err);
                                        toast({ title: "Có lỗi xảy ra", variant: "destructive" });
                                    }
                                }}
                            >
                                Xoá
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
