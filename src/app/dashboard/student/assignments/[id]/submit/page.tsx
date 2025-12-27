"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "lms-submissions";

const MIME_WHITELIST = new Set([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "text/plain",
    "image/png",
    "image/jpeg",
    "application/zip",
]);

function slugify(name: string) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9.]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$|\s+/g, "");
}

export default function SubmitAssignmentFilesPage() {
    const params = useParams() as { assignmentId: string };
    const { assignmentId } = params;
    const router = useRouter();
    const { toast } = useToast();
    const [files, setFiles] = useState<File[]>([]);
    const [uploaded, setUploaded] = useState<{ fileName: string; mimeType: string; sizeBytes: number; storagePath: string }[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [status, setStatus] = useState<"draft" | "submitted" | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const list = e.target.files ? Array.from(e.target.files) : [];
        setFiles((prev) => [...prev, ...list]);
    }, []);

    const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const dtFiles = e.dataTransfer.files ? Array.from(e.dataTransfer.files) : [];
        if (dtFiles.length) setFiles((prev) => [...prev, ...dtFiles]);
    }, []);

    const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    }, []);

    const totalSize = useMemo(() => files.reduce((s, f) => s + f.size, 0), [files]);

    const uploadSelectedFiles = useCallback(async (): Promise<{ fileName: string; mimeType: string; sizeBytes: number; storagePath: string }[]> => {
        const results: { fileName: string; mimeType: string; sizeBytes: number; storagePath: string }[] = [];
        for (const f of files) {
            if (f.size > MAX_FILE_SIZE) throw new Error(`${f.name} vượt quá 20MB`);
            if (f.type && !MIME_WHITELIST.has(f.type)) throw new Error(`${f.name} định dạng không hỗ trợ`);
            const form = new FormData();
            form.append("file", f);
            const resp = await fetch(`/api/submissions/upload?assignmentId=${assignmentId}`, { method: "POST", body: form });
            const j = await resp.json();
            if (!resp.ok || !j.success) throw new Error(j?.message || `Upload thất bại: ${f.name}`);
            results.push(j.data);
        }
        return results;
    }, [assignmentId, files]);

    const saveDraft = useCallback(async () => {
        if (!files.length && !uploaded.length) return;
        setIsSaving(true);
        try {
            setIsUploading(true);
            const newUploaded = await uploadSelectedFiles();
            const allFiles = [...uploaded, ...newUploaded];
            const res = await fetch(`/api/submissions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ assignmentId, files: allFiles, status: "draft" }),
            });
            const json = await res.json();
            if (!res.ok || !json?.success) throw new Error(json?.message || "Lưu nháp thất bại");
            setUploaded(allFiles);
            setFiles([]);
            setStatus("draft");
            toast({ title: "Đã lưu thay đổi", description: `Lưu ${allFiles.length} file vào bản nháp` });
        } catch (e: any) {
            toast({ title: "Lỗi lưu nháp", description: e.message || "Đã xảy ra lỗi", variant: "destructive" });
        } finally {
            setIsUploading(false);
            setIsSaving(false);
        }
    }, [assignmentId, files.length, toast, uploadSelectedFiles, uploaded]);

    const confirmSubmit = useCallback(async () => {
        try {
            if (!uploaded.length && files.length) {
                await saveDraft();
            }
            setIsSubmitting(true);
            const res = await fetch(`/api/submissions`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ assignmentId }),
            });
            const j = await res.json();
            if (!res.ok || !j?.success) throw new Error(j?.message || "Xác nhận nộp bài thất bại");
            toast({ title: "Đã nộp bài", description: "Bài nộp đã được xác nhận" });
            router.push(`/dashboard/student/assignments/${assignmentId}`);
        } catch (e: any) {
            toast({ title: "Lỗi nộp bài", description: e.message || "Đã xảy ra lỗi", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    }, [assignmentId, files.length, router, saveDraft, toast, uploaded.length]);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`/api/submissions?assignmentId=${assignmentId}`);
                const j = await res.json();
                if (res.ok && j?.data) {
                    setUploaded(j.data.files || []);
                    setStatus(j.data.status || "draft");
                }
            } catch (_) {
                // ignore
            }
        })();
    }, [assignmentId]);

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header thumbnail */}
            <div className="relative overflow-hidden rounded-3xl border border-indigo-50 bg-gradient-to-r from-indigo-50 via-sky-50 to-emerald-50 px-4 py-4 sm:px-6 sm:py-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
                <div className="space-y-1">
                    <h1 className="text-base sm:text-lg md:text-xl font-bold text-slate-900">
                        Nộp bài bằng file
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-600 max-w-2xl">
                        Chọn và tải lên nhiều tệp (tối đa 20MB mỗi tệp). Hỗ trợ: PDF, DOCX, DOC, TXT, PNG, JPEG, ZIP.
                    </p>
                </div>
            </div>

            <Card className="bg-white/90 rounded-3xl border border-slate-100 shadow-sm p-4 sm:p-6 space-y-5">
                <div
                    className="border-2 border-dashed border-slate-200 rounded-2xl px-4 py-6 sm:px-6 sm:py-8 text-center text-xs sm:text-sm text-slate-600 bg-slate-50/70 hover:border-indigo-300 hover:bg-slate-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onClick={(e) => {
                        if (e.currentTarget !== e.target) return;
                        fileInputRef.current?.click();
                    }}
                    onKeyDown={(e) => {
                        if (e.currentTarget !== e.target) return;
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            fileInputRef.current?.click();
                        }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label="Chọn tệp để tải lên"
                >
                    <p className="font-medium text-slate-800 mb-1">Kéo và thả tệp vào đây</p>
                    <p className="text-[11px] sm:text-xs text-slate-500 mb-3">
                        hoặc chọn từ thiết bị của bạn
                    </p>
                    <div className="mt-2 flex justify-center">
                        <Input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            onChange={onFileChange}
                            onClick={(e) => e.stopPropagation()}
                            className="w-auto text-xs sm:text-sm"
                        />
                    </div>
                </div>

                <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <div className="text-xs sm:text-sm font-medium text-slate-800">
                            Đã thêm mới: {files.length} tệp
                        </div>
                        <div className="text-[11px] text-slate-500">
                            Tổng dung lượng: {(totalSize / (1024 * 1024)).toFixed(2)} MB
                        </div>
                    </div>
                    {status && (
                        <div className="text-[11px] sm:text-xs text-slate-500">
                            Trạng thái hiện tại: <span className="font-semibold text-slate-700">{status}</span>
                        </div>
                    )}
                </div>

                {uploaded.length > 0 && (
                    <div className="mt-3">
                        <div className="text-xs sm:text-sm font-medium text-slate-800">
                            Trong bản nháp hiện tại ({status || "draft"}):
                        </div>
                        <ul className="mt-2 list-disc list-inside text-xs sm:text-sm text-slate-700 space-y-1">
                            {uploaded.map((f, idx) => (
                                <li key={idx}>{f.fileName}</li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="mt-6 flex flex-wrap items-center gap-2 justify-end">
                    <Button
                        variant="outline"
                        onClick={() => setFiles([])}
                        disabled={isSaving || isUploading}
                        size="sm"
                        className="rounded-full px-4"
                    >
                        Xoá tệp mới chọn
                    </Button>
                    <Button
                        onClick={confirmSubmit}
                        disabled={(uploaded.length === 0 && files.length === 0) || isSubmitting}
                        size="sm"
                        className="ml-auto inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-sky-500 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:shadow-md hover:from-indigo-600 hover:to-sky-600 disabled:opacity-60"
                    >
                        {isSubmitting ? "Đang nộp..." : "Nộp bài"}
                    </Button>
                </div>
            </Card>
        </div>
    );
}


