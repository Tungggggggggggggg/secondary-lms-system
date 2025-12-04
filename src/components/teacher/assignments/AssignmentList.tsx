"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAssignments, type AssignmentT } from "@/hooks/use-assignments";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import EmptyState from "@/components/shared/EmptyState";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import AssignmentTypeBadge from "./AssignmentTypeBadge";
import AssignmentStatusBadge from "./AssignmentStatusBadge";
import AssignmentListSkeleton from "./AssignmentListSkeleton";
import ClassroomBadges from "./ClassroomBadges";
import { CalendarDays, FileText, Inbox, Eye, Pencil, Trash2 } from "lucide-react";

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
    const [deleting, setDeleting] = useState(false);

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

    const handleConfirmDelete = async () => {
        if (!confirmAssignmentId) return;
        const id = confirmAssignmentId;
        try {
            setDeleting(true);
            const res = await fetch(`/api/assignments/${id}`, { method: "DELETE" });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                toast({
                    title: "Xoá bài tập thất bại",
                    description: (data as any)?.message,
                    variant: "destructive",
                });
                return;
            }
            toast({ title: "Đã xoá bài tập", variant: "success" });
            setConfirmAssignmentId(null);
            doRefresh();
        } catch (err) {
            console.error("[DELETE ASSIGNMENT]", err);
            toast({ title: "Có lỗi xảy ra", variant: "destructive" });
        } finally {
            setDeleting(false);
        }
    };

    // Hiển thị trạng thái loading/error rõ ràng
    if (loading) {
        return <AssignmentListSkeleton />;
    }
    if (error) {
        return (
            <div className="py-6">
                <Alert variant="destructive">
                    <AlertTitle>Lỗi tải danh sách bài tập</AlertTitle>
                    <AlertDescription className="flex items-center justify-between gap-4">
                        <span>{error}</span>
                        <Button variant="outline" onClick={doRefresh}>
                            Thử lại
                        </Button>
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    if (assignments.length === 0) {
        return (
            <div className="py-8">
                <EmptyState
                    variant="teacher"
                    title="Chưa có bài tập nào"
                    description="Hãy tạo bài tập đầu tiên để giao cho học sinh."
                    icon={<FileText className="h-12 w-12 text-blue-500" />}
                    action={
                        <Button
                            size="lg"
                            onClick={() =>
                                router.push("/dashboard/teacher/assignments/new")
                            }
                        >
                            Tạo bài tập mới
                        </Button>
                    }
                />
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
                            <AssignmentTypeBadge type={assignment.type} />
                            <AssignmentStatusBadge status="IN_PROGRESS" />
                        </div>
                    </div>

                    {/* Classroom badges */}
                    <div className="mt-3">
                        <ClassroomBadges assignmentId={assignment.id} maxVisible={3} />
                    </div>

                    <div className="mt-4 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1.5">
                                <CalendarDays className="h-4 w-4 text-gray-500" />
                                <span className="text-gray-600">Hạn nộp:</span>
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
                            <span className="flex items-center gap-1.5">
                                <Inbox className="h-4 w-4 text-gray-500" />
                                <span className="text-gray-600">
                                    Đã nộp:
                                </span>
                                <span className="font-medium text-gray-800">
                                    {assignment._count?.submissions ?? 0}
                                </span>
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            {assignment.type === "QUIZ" && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="text-emerald-600 hover:bg-emerald-50"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        router.push(
                                            `/dashboard/teacher/exams/monitor?assignmentId=${assignment.id}`
                                        );
                                    }}
                                >
                                    <Eye className="h-4 w-4 mr-1.5" />
                                    Giám sát thi
                                </Button>
                            )}
                            <Button
                                type="button"
                                variant="ghost"
                                className="text-purple-600 hover:bg-purple-50"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(
                                        `/dashboard/teacher/assignments/${assignment.id}/edit`
                                    );
                                }}
                            >
                                <Pencil className="h-4 w-4 mr-1.5" />
                                Chỉnh sửa
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                className="text-blue-600 hover:bg-blue-50"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(
                                        `/dashboard/teacher/assignments/${assignment.id}/submissions`
                                    );
                                }}
                            >
                                <Eye className="h-4 w-4 mr-1.5" />
                                Xem bài nộp
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                className="text-red-600 hover:bg-red-50"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmAssignmentId(assignment.id);
                                }}
                            >
                                <Trash2 className="h-4 w-4 mr-1.5" />
                                Xoá
                            </Button>
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
            <ConfirmDialog
                open={!!confirmAssignmentId}
                onOpenChange={(open) => {
                    if (!open) {
                        setConfirmAssignmentId(null);
                    }
                }}
                onConfirm={handleConfirmDelete}
                title="Xác nhận xoá bài tập"
                description="Hành động này không thể hoàn tác. Bạn chắc chắn muốn xoá?"
                variant="danger"
                confirmText="Xoá"
                cancelText="Huỷ"
                loading={deleting}
            />
        </div>
    );
}
