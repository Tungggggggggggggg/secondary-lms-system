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
    const { id: assignmentId } = useParams() as { id: string };
    const router = useRouter();
    const { toast } = useToast(); // Sử dụng toast custom

    const [detail, setDetail] = useState<AssignmentDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [attachments, setAttachments] = useState<Array<{ id: string; name: string; path: string; size: number; mimeType: string; createdAt: string; url?: string | null }>>([]);
    const [loadingFiles, setLoadingFiles] = useState(false);

    const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "lms-submissions";
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const publicUrlForStored = (path: string) => {
        const clean = path.replace(/^\//, "");
        return SUPABASE_URL
            ? `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${clean}`
            : `/storage/v1/object/public/${BUCKET}/${clean}`;
    };

    useEffect(() => {
        async function fetchDetail() {
            const startTime = Date.now();
            try {
                setLoading(true);
                setError(null);
                console.log(`[AssignmentDetail] Starting fetch for ID: ${assignmentId}`);

                if (!assignmentId) {
                    setError("Không tìm thấy ID bài tập");
                    return;
                }

                // Thêm timeout để tránh loading vô hạn
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

                const apiUrl = `/api/assignments/${assignmentId}`;
                console.log(`[AssignmentDetail] Calling API:`, apiUrl);

                const res = await fetch(apiUrl, {
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                console.log(`[AssignmentDetail] API response time: ${Date.now() - startTime}ms, status: ${res.status}`);
                if (!res.ok) {
                    const errorText = await res.text().catch(() => 'Unknown error');
                    console.error(`[AssignmentDetail] HTTP Error ${res.status}:`, errorText);
                    setError(`Lỗi ${res.status}: ${errorText}`);
                    toast({
                        title: "Không lấy được dữ liệu bài tập!",
                        description: `Status: ${res.status}`,
                        variant: "destructive",
                    });
                    return;
                }
                const result = await res.json();
                console.log(`[AssignmentDetail] API result:`, result);

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
                    `[AssignmentDetail] Lấy dữ liệu thành công sau ${Date.now() - startTime}ms:`,
                    result.data
                );
            } catch (err: unknown) {
                let msg = "Lỗi không xác định";
                if (err instanceof Error) {
                    if (err.name === 'AbortError') {
                        msg = "Tải dữ liệu quá lâu, vui lòng thử lại";
                    } else {
                        msg = err.message;
                    }
                }
                setError(msg);
                setDetail(null);
                toast({
                    title: "Lỗi khi tải chi tiết bài tập!",
                    description: msg,
                    variant: "destructive",
                });
                console.error(`[AssignmentDetail] Lỗi khi fetch sau ${Date.now() - startTime}ms:`, err);
            } finally {
                setLoading(false);
            }
        }
        if (assignmentId) fetchDetail();
    }, [assignmentId, toast]);

    // Fetch attachments
    useEffect(() => {
        if (!assignmentId) return;
        let cancelled = false;
        (async () => {
            try {
                setLoadingFiles(true);
                const r = await fetch(`/api/assignments/${assignmentId}/files`);
                const j = await r.json().catch(() => ({}));
                if (!cancelled && r.ok && j?.success && Array.isArray(j.data)) {
                    setAttachments(j.data);
                } else if (!cancelled) {
                    setAttachments([]);
                }
            } catch (e) {
                if (!cancelled) {
                    console.error('[AssignmentDetail] Lỗi tải files:', e);
                }
            } finally {
                if (!cancelled) setLoadingFiles(false);
            }
        })();
        return () => { cancelled = true; };
    }, [assignmentId]);

    if (loading)
        return (
            <div className="px-6 py-4">
                <div className="max-w-5xl mx-auto">
                    <div className="bg-white rounded-2xl shadow-lg p-8">
                        <div className="flex flex-col items-center justify-center py-16 space-y-4">
                            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                            <div className="text-gray-700 font-semibold text-lg">Đang tải chi tiết bài tập...</div>
                            <div className="text-sm text-gray-500">Vui lòng chờ trong giây lát</div>
                        </div>
                    </div>
                </div>
            </div>
        );
    if (error)
        return (
            <div className="px-6 py-4">
                <div className="max-w-5xl mx-auto">
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-8">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <span className="text-4xl">❗</span>
                            <h2 className="text-xl font-semibold text-red-800">Không thể tải chi tiết bài tập</h2>
                            <p className="text-red-600 max-w-md">{error}</p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => window.location.reload()}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                >
                                    🔄 Thử lại
                                </button>
                                <button
                                    onClick={() => router.push('/dashboard/teacher/assignments')}
                                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                                >
                                    ← Quay lại danh sách
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
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
                            variant="outline"
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

                            {/* File đính kèm */}
                            {loadingFiles ? (
                                <div className="text-sm text-gray-500 mb-4">Đang tải file đính kèm...</div>
                            ) : attachments.length > 0 ? (
                                <div className="mb-6">
                                    <h3 className="text-md font-semibold mb-3 text-gray-700 flex items-center gap-2">
                                        <span>📎</span> File đính kèm
                                    </h3>
                                    <div className="space-y-2">
                                        {attachments.map((file) => {
                                            const href = file.url || publicUrlForStored(file.path);
                                            const isImg = file.mimeType?.startsWith('image/');
                                            const isVid = file.mimeType?.startsWith('video/');
                                            return (
                                                <div key={file.id} className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-2xl">{isImg ? '🖼️' : isVid ? '🎥' : '📄'}</span>
                                                        <div>
                                                            <p className="font-medium text-sm">{file.name}</p>
                                                            <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB • {file.mimeType}</p>
                                                        </div>
                                                    </div>
                                                    <a href={href} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">Tải xuống</a>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <hr className="my-6 border-gray-200" />
                                </div>
                            ) : null}
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
        </div>
    );
}
