"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Breadcrumb, { BreadcrumbItem } from "@/components/ui/breadcrumb";
import BackButton from "@/components/ui/back-button";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AssignmentCommentsView from "@/components/teacher/comments/AssignmentCommentsView";
import type { AssignmentDetail } from "@/types/api";

// Helper hiển thị Chip loại bài tập
function AssignmentTypeChip({ type }: { type?: string }) {
    if (!type) return null;
    const PROPS = {
        ESSAY: {
            className: "bg-indigo-50 text-indigo-700 border border-indigo-200",
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
            className={`inline-flex items-center gap-1 px-4 py-1 rounded-full text-sm font-semibold ${props.className}`}
        >
            <span>{props.icon}</span>
            <span>{props.label}</span>
        </span>
    );
}

export default function AssignmentDetailPage() {
    const { assignmentId } = useParams() as { assignmentId: string };
    const router = useRouter();
    const { toast } = useToast(); // Sử dụng toast custom

    const [detail, setDetail] = useState<AssignmentDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchDetail() {
            try {
                setLoading(true);
                setError(null);
                const res = await fetch(`/api/assignments/${assignmentId}`);
                if (!res.ok) {
                    toast({
                        title: "Không lấy được dữ liệu bài tập!",
                        description: `Status: ${res.status}`,
                        variant: "destructive",
                    });
                    console.error(
                        "[AssignmentDetail] Fetch thất bại, status:",
                        res.status
                    );
                }
                const result = await res.json();
                if (!result.success) {
                    setError(
                        result.message || "Không lấy được dữ liệu bài tập"
                    );
                    setDetail(null);
                    toast({
                        title:
                            result.message || "Lỗi bất thường khi lấy bài tập!",
                        variant: "destructive",
                    });
                    console.error(
                        "[AssignmentDetail] API trả về lỗi:",
                        result.message
                    );
                    return;
                }
                setDetail(result.data as AssignmentDetail);
                console.log(
                    "[AssignmentDetail] Dữ liệu assignment:",
                    result.data
                );
            } catch (err: unknown) {
                let msg = "Lỗi không xác định";
                if (err instanceof Error) msg = err.message;
                setError(msg);
                setDetail(null);
                toast({
                    title: "Lỗi khi tải chi tiết bài tập!",
                    description: msg,
                    variant: "destructive",
                });
                console.error("[AssignmentDetail] Lỗi khi fetch:", err);
            } finally {
                setLoading(false);
            }
        }
        if (assignmentId) fetchDetail();
    }, [assignmentId, toast]);

    if (loading)
        return (
            <div className="py-20 flex flex-col justify-center items-center text-gray-500 animate-pulse">
                <span className="text-3xl mb-3">⏳</span>
                Đang tải chi tiết bài tập...
            </div>
        );
    if (error)
        return (
            <div className="py-20 flex flex-col items-center text-red-500">
                <span className="text-3xl mb-3">❗</span>
                Lỗi: {error}
            </div>
        );
    if (!detail)
        return (
            <div className="py-20 flex flex-col items-center text-gray-400">
                <span className="text-4xl mb-3">😵‍💫</span>
                Không tìm thấy bài tập.
            </div>
        );

    const breadcrumbItems: BreadcrumbItem[] = [
        { label: "Dashboard", href: "/dashboard/teacher/dashboard" },
        { label: "Bài tập", href: "/dashboard/teacher/assignments" },
        { label: detail.title, href: `#` },
    ];

    return (
        <div className="px-6 py-4">
            <div className="mb-4 flex items-center justify-between">
                <Breadcrumb items={breadcrumbItems} />
                <BackButton href="/dashboard/teacher/assignments" />
            </div>

            <div className="max-w-5xl mx-auto">
            {/* Header assignment */}
            <div className="bg-white shadow rounded-2xl p-8 mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-6 border">
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-800 mb-1">
                        {detail.title}
                    </h1>
                    <p className="text-gray-600 mt-1">
                        {detail.description || (
                            <span className="italic">(Không có mô tả)</span>
                        )}
                    </p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                    <AssignmentTypeChip type={detail.type} />
                    <span className="text-xs text-gray-500 mt-2">
                        <span className="font-semibold">Hạn nộp: </span>
                        {detail.dueDate
                            ? new Date(detail.dueDate).toLocaleString()
                            : "Không rõ"}
                    </span>
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={async () => {
                            const ok = window.confirm(
                                "Bạn muốn xoá bài tập này? Hành động không thể hoàn tác."
                            );
                            if (!ok) return;
                            try {
                                const res = await fetch(`/api/assignments/${assignmentId}`, { method: "DELETE" });
                                const data = await res.json().catch(() => ({}));
                                if (!res.ok) {
                                    toast({ title: "Xoá bài tập thất bại", description: (data as any)?.message, variant: "destructive" });
                                    return;
                                }
                                toast({ title: "Đã xoá bài tập", variant: "success" });
                                router.push("/dashboard/teacher/assignments");
                            } catch (err) {
                                console.error("[AssignmentDetail] Xoá thất bại:", err);
                                toast({ title: "Có lỗi xảy ra", variant: "destructive" });
                            }
                        }}
                    >
                        🗑️ Xoá bài tập
                    </Button>
                </div>
            </div>

            {/* Tabs: Questions và Discussions */}
            <Tabs defaultValue="questions" className="mt-6">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="questions">Câu hỏi</TabsTrigger>
                    <TabsTrigger value="discussions">Thảo luận</TabsTrigger>
                </TabsList>

                <TabsContent value="questions" className="mt-6">
                    {/* Danh sách câu hỏi */}
                    <div className="bg-white rounded-2xl p-6 shadow border">
                <h2 className="text-lg font-bold mb-4 text-indigo-700 flex items-center gap-2">
                    <span>📄</span> Danh sách câu hỏi
                </h2>
                {(!detail.questions || detail.questions.length === 0) && (
                    <div className="text-gray-400 italic py-4">
                        Bài tập này chưa có câu hỏi nào.
                    </div>
                )}
                {/* Render đẹp từng câu hỏi */}
                <ol className="space-y-7">
                    {detail.questions
                        ?.sort((a, b) => a.order - b.order)
                        .map((q, idx) => (
                            <li
                                key={q.id}
                                className={cn(
                                    "bg-gradient-to-br from-purple-50 to-white border-l-4 pl-5 pr-3 py-4 rounded-2xl shadow flex flex-col gap-2",
                                    q.type === "ESSAY"
                                        ? "border-indigo-400"
                                        : "border-pink-400"
                                )}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-indigo-800">
                                        Câu {idx + 1}:
                                    </span>
                                    {q.type === "ESSAY" ? (
                                        <span className="ml-2 inline-block text-xs px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full">
                                            Tự luận
                                        </span>
                                    ) : (
                                        <span className="ml-2 inline-block text-xs px-3 py-1 bg-pink-100 text-pink-700 rounded-full">
                                            Trắc nghiệm
                                        </span>
                                    )}
                                    <span className="ml-auto text-xs text-gray-400 font-mono">
                                        #{q.id}
                                    </span>
                                </div>
                                <div className="text-gray-700 text-base mb-1 whitespace-pre-line">
                                    {q.content}
                                </div>
                                {/* Hiển thị options nếu là trắc nghiệm */}
                                {q.type !== "ESSAY" &&
                                    q.options &&
                                    q.options.length > 0 && (
                                        <ul className="ml-2 flex flex-col gap-1 mt-2">
                                            {q.options
                                                .sort(
                                                    (a, b) =>
                                                        (a.order ?? 0) -
                                                        (b.order ?? 0)
                                                )
                                                .map((opt) => (
                                                    <li
                                                        key={opt.id}
                                                        className="flex items-center gap-2 group"
                                                    >
                                                        <span
                                                            className={cn(
                                                                "inline-block w-10 h-10 rounded-xl flex items-center justify-center font-bold border border-gray-200 text-lg",
                                                                opt.isCorrect
                                                                    ? "bg-green-50 border-green-400 text-green-700"
                                                                    : "bg-gray-50 text-gray-500"
                                                            )}
                                                        >
                                                            {opt.label}
                                                        </span>
                                                        <span
                                                            className={cn(
                                                                opt.isCorrect
                                                                    ? "font-medium text-green-700"
                                                                    : "text-gray-700"
                                                            )}
                                                        >
                                                            {opt.content}
                                                        </span>
                                                        {opt.isCorrect && (
                                                            <span className="ml-2 text-xs text-green-700 bg-green-100 rounded-full px-2">
                                                                Đáp án đúng
                                                            </span>
                                                        )}
                                                    </li>
                                                ))}
                                        </ul>
                                    )}
                                {/* Nếu là tự luận, note rõ cho UI sinh động */}
                                {q.type === "ESSAY" && (
                                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl px-6 py-3 text-indigo-700 text-sm italic flex items-center gap-2 mt-2">
                                        <span className="text-2xl">📝</span>(Câu
                                        hỏi tự luận)
                                    </div>
                                )}
                            </li>
                        ))}
                </ol>
                    </div>
                </TabsContent>

                <TabsContent value="discussions" className="mt-6">
                    <AssignmentCommentsView assignmentId={assignmentId} />
                </TabsContent>
            </Tabs>

            {/* Quick Actions */}
            <div className="mt-6 flex justify-end">
                <Button
                    onClick={() => router.push(`/dashboard/teacher/assignments/${assignmentId}/submissions`)}
                    size="lg"
                >
                    📝 Chấm bài tập
                </Button>
            </div>
        </div>
    );
}
