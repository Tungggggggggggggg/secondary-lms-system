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
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { AssignmentTypeBadge, EmptyState, PageHeader } from "@/components/shared";
import RichTextPreview from "@/components/shared/RichTextPreview";
import { AlertTriangle, Loader2, Trash2, PenLine, FileText, Paperclip, Image as ImageIcon, Video as VideoIcon, Clock, Shield } from "lucide-react";

// Helper hiển thị Chip loại bài tập
function AssignmentTypeChip({ type }: { type?: string }) {
    if (!type) return null;
    return <AssignmentTypeBadge type={type} variant="teacher" />;
}

function stripHtml(value?: string | null) {
    if (!value) return "";
    return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function getOptionalMessage(value: unknown): string | undefined {
    if (typeof value !== "object" || value === null) return undefined;
    const record = value as Record<string, unknown>;
    return typeof record.message === "string" ? record.message : undefined;
}

export default function AssignmentDetailPage() {
    const { id: assignmentId } = useParams() as { id: string };
    const router = useRouter();
    const { toast } = useToast(); // Sử dụng toast custom
    const confirm = useConfirm();

    const [detail, setDetail] = useState<AssignmentDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [retryKey, setRetryKey] = useState(0);
    const [attachments, setAttachments] = useState<Array<{ id: string; name: string; path: string; size: number; mimeType: string; createdAt: string; url?: string | null }>>([]);
    const [loadingFiles, setLoadingFiles] = useState(false);

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
    }, [assignmentId, toast, retryKey]);

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
    }, [assignmentId, retryKey]);

    if (loading)
        return (
            <div className="space-y-4">
                <div className="bg-card rounded-2xl shadow-lg border border-border p-8">
                    <div className="flex flex-col items-center justify-center py-16 space-y-4">
                        <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
                        <div className="text-foreground font-semibold text-lg">Đang tải chi tiết bài tập...</div>
                        <div className="text-sm text-muted-foreground">Vui lòng chờ trong giây lát</div>
                    </div>
                </div>
            </div>
        );
    if (error)
        return (
            <EmptyState
                variant="teacher"
                icon={<AlertTriangle className="h-10 w-10 text-red-500" />}
                title="Không thể tải chi tiết bài tập"
                description={error}
                action={
                    <div className="flex justify-center gap-3">
                        <Button variant="outline" onClick={() => setRetryKey((v) => v + 1)}>
                            Thử lại
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => router.push("/dashboard/teacher/assignments")}
                        >
                            Quay lại danh sách
                        </Button>
                    </div>
                }
            />
        );
    if (!detail)
        return (
            <EmptyState
                variant="teacher"
                icon={<AlertTriangle className="h-10 w-10 text-blue-500" />}
                title="Không tìm thấy bài tập"
                description="Bài tập có thể đã bị xoá hoặc bạn không có quyền truy cập."
                action={
                    <Button
                        variant="outline"
                        onClick={() => router.push("/dashboard/teacher/assignments")}
                    >
                        Quay lại danh sách
                    </Button>
                }
            />
        );

    const breadcrumbItems: BreadcrumbItem[] = [
        { label: "Dashboard", href: "/dashboard/teacher/dashboard" },
        { label: "Bài tập", href: "/dashboard/teacher/assignments" },
        { label: detail.title, href: `#` },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Breadcrumb items={breadcrumbItems} />
                <BackButton href="/dashboard/teacher/assignments" />
            </div>

            <PageHeader
                role="teacher"
                title={detail.title}
                subtitle={detail.description || "Chi tiết bài tập cho lớp học của bạn."}
                actions={
                    <div className="flex flex-col items-end gap-2 text-xs text-muted-foreground">
                        <div>
                            <span className="font-semibold">Hạn nộp: </span>
                            {(() => {
                                const effective =
                                    detail.type === "QUIZ" ? (detail.lockAt ?? detail.dueDate) : detail.dueDate;
                                return effective
                                    ? new Date(effective).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
                                    : "Không rõ";
                            })()}
                        </div>
                        {(detail.openAt || detail.lockAt) && (
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>
                                    Lịch: {detail.openAt ? new Date(detail.openAt).toLocaleString("vi-VN") : "Hiện tại"} → {detail.lockAt ? new Date(detail.lockAt).toLocaleString("vi-VN") : (detail.dueDate ? new Date(detail.dueDate).toLocaleString("vi-VN") : "Không giới hạn")}
                                </span>
                            </div>
                        )}
                        <div className="mt-1 flex items-center gap-3">
                            <AssignmentTypeChip type={detail.type} />
                            <Button
                                variant="outline"
                                size="sm"
                                className="inline-flex items-center gap-2"
                                onClick={async () => {
                                    const ok = await confirm({
                                        title: "Xoá bài tập",
                                        description: "Bạn muốn xoá bài tập này? Hành động không thể hoàn tác.",
                                        variant: "danger",
                                        confirmText: "Xoá",
                                        cancelText: "Hủy",
                                    });
                                    if (!ok) return;
                                    try {
                                        const res = await fetch(`/api/assignments/${assignmentId}`, { method: "DELETE" });
                                        const data: unknown = await res.json().catch(() => ({}));
                                        if (!res.ok) {
                                            toast({ title: "Xoá bài tập thất bại", description: getOptionalMessage(data), variant: "destructive" });
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
                                <Trash2 className="h-4 w-4" />
                                Xoá bài tập
                            </Button>
                        </div>
                    </div>
                }
            />

            {/* Tabs: Questions và Discussions */}
            <Tabs defaultValue="questions" className="mt-2">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="questions">Câu hỏi</TabsTrigger>
                    <TabsTrigger value="discussions">Thảo luận</TabsTrigger>
                </TabsList>

                <TabsContent value="questions" className="mt-6">
                    {/* Danh sách câu hỏi */}
                    <div className="bg-card rounded-2xl p-6 shadow border border-border">
                        <h2 className="text-lg font-bold mb-4 text-indigo-700 flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Danh sách câu hỏi
                        </h2>

                        {/* File đính kèm */}
                        {loadingFiles ? (
                            <div className="text-sm text-muted-foreground mb-4">Đang tải file đính kèm...</div>
                        ) : attachments.length > 0 ? (
                            <div className="mb-6">
                                <h3 className="text-md font-semibold mb-3 text-foreground flex items-center gap-2">
                                    <Paperclip className="h-4 w-4" />
                                    File đính kèm
                                </h3>
                                <div className="space-y-2">
                                    {attachments.map((file) => {
                                        const href = typeof file.url === "string" ? file.url : null;
                                        const isImg = file.mimeType?.startsWith("image/");
                                        const isVid = file.mimeType?.startsWith("video/");
                                        return (
                                            <div key={file.id} className="flex items-center justify-between gap-3 p-3 bg-muted/40 rounded-lg border border-border">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-background shadow-sm">
                                                        {isImg ? (
                                                            <ImageIcon className="h-5 w-5 text-sky-500" />
                                                        ) : isVid ? (
                                                            <VideoIcon className="h-5 w-5 text-violet-500" />
                                                        ) : (
                                                            <FileText className="h-5 w-5 text-muted-foreground" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-sm text-foreground">{file.name}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {(file.size / 1024 / 1024).toFixed(2)} MB • {file.mimeType}
                                                        </p>
                                                    </div>
                                                </div>
                                                {href ? (
                                                    <a href={href} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">
                                                        Tải xuống
                                                    </a>
                                                ) : (
                                                    <span className="text-sm text-muted-foreground">Không tạo được link tải</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                                <hr className="my-6 border-border" />
                            </div>
                        ) : null}

                        {(!detail.questions || detail.questions.length === 0) ? (
                            <div className="text-muted-foreground italic py-4">Bài tập này chưa có câu hỏi nào.</div>
                        ) : (
                            <>
                                {/* Render đẹp từng câu hỏi */}
                                <ol className="space-y-7">
                                    {[...detail.questions]
                                        .sort((a, b) => a.order - b.order)
                                        .map((q, idx) => (
                                            <li
                                                key={q.id}
                                                className={cn(
                                                    "bg-gradient-to-br from-purple-50 to-white border-l-4 pl-5 pr-3 py-4 rounded-2xl shadow flex flex-col gap-2",
                                                    q.type === "ESSAY" ? "border-indigo-400" : "border-pink-400"
                                                )}
                                            >
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-semibold text-indigo-800">Câu {idx + 1}:</span>
                                                    {q.type === "ESSAY" ? (
                                                        <span className="ml-2 inline-block text-xs px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full">Tự luận</span>
                                                    ) : (
                                                        <span className="ml-2 inline-block text-xs px-3 py-1 bg-pink-100 text-pink-700 rounded-full">Trắc nghiệm</span>
                                                    )}
                                                </div>

                                                {q.type === "ESSAY" ? (
                                                    <RichTextPreview html={q.content || ""} className="text-foreground text-base mb-1" />
                                                ) : (
                                                    <div className="text-foreground text-base mb-1 whitespace-pre-line">{stripHtml(q.content)}</div>
                                                )}

                                                {q.type !== "ESSAY" && q.options && q.options.length > 0 && (
                                                    <ul className="ml-2 flex flex-col gap-1 mt-2">
                                                        {[...q.options]
                                                            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                                                            .map((opt) => (
                                                                <li key={opt.id} className="flex items-center gap-2 group">
                                                                    <span
                                                                        className={cn(
                                                                            "w-10 h-10 rounded-xl flex items-center justify-center font-bold border border-border text-lg",
                                                                            opt.isCorrect
                                                                                ? "bg-green-50 border-green-400 text-green-700"
                                                                                : "bg-muted/40 text-muted-foreground"
                                                                        )}
                                                                    >
                                                                        {opt.label}
                                                                    </span>
                                                                    <span className={cn(opt.isCorrect ? "font-medium text-green-700" : "text-foreground")}>
                                                                        {stripHtml(opt.content)}
                                                                    </span>
                                                                    {opt.isCorrect && (
                                                                        <span className="ml-2 text-xs text-green-700 bg-green-100 rounded-full px-2">Đáp án đúng</span>
                                                                    )}
                                                                </li>
                                                            ))}
                                                    </ul>
                                                )}

                                                {q.type === "ESSAY" && (
                                                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl px-6 py-3 text-indigo-700 text-sm italic flex items-center gap-2 mt-2">
                                                        <FileText className="h-4 w-4" />
                                                        <span>(Câu hỏi tự luận)</span>
                                                    </div>
                                                )}
                                            </li>
                                        ))}
                                </ol>
                            </>
                        )}
                    </div>
                </TabsContent>

                    <TabsContent value="discussions" className="mt-6">
                        <AssignmentCommentsView assignmentId={assignmentId} />
                    </TabsContent>
                </Tabs>

            {/* Quick Actions */}
            <div className="mt-6 flex justify-end">
                {detail.type === "QUIZ" && (
                    <Button
                        variant="outline"
                        onClick={() => router.push(`/dashboard/teacher/exams/monitor?assignmentId=${assignmentId}`)}
                        size="lg"
                        className="inline-flex items-center gap-2 mr-3"
                    >
                        <Shield className="h-4 w-4" />
                        Giám sát chống gian lận
                    </Button>
                )}
                <Button
                    onClick={() => router.push(`/dashboard/teacher/assignments/${assignmentId}/submissions`)}
                    size="lg"
                    className="inline-flex items-center gap-2"
                >
                    <PenLine className="h-4 w-4" />
                    Chấm bài tập
                </Button>
            </div>
        </div>
    );
}
