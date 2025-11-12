"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
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
        <div className="px-6 py-6">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold">Nộp bài bằng file</h1>
                <p className="text-sm text-gray-600">Chọn nhiều file (tối đa 20MB mỗi file). Định dạng: PDF, DOCX, DOC, TXT, PNG, JPEG, ZIP.</p>
            </div>
            <Card className="p-4">
                <div
                    className="border-2 border-dashed rounded-md p-6 text-center text-sm text-gray-600"
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                >
                    Kéo thả tệp vào đây hoặc
                    <div className="mt-2 flex justify-center">
                        <Input type="file" multiple onChange={onFileChange} className="w-auto" />
                    </div>
                </div>

                <div className="mt-4">
                    <div className="text-sm font-medium">Đã thêm mới: {files.length} file</div>
                    <div className="text-xs text-gray-500">Tổng {(totalSize / (1024 * 1024)).toFixed(2)} MB</div>
                </div>

                {uploaded.length > 0 && (
                    <div className="mt-4">
                        <div className="text-sm font-medium">Trong bản nháp hiện tại ({status || "draft"}):</div>
                        <ul className="mt-2 list-disc list-inside text-sm text-gray-700">
                            {uploaded.map((f, idx) => (
                                <li key={idx}>{f.fileName}</li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="mt-6 flex gap-2">
                    <Button onClick={saveDraft} disabled={(files.length === 0 && uploaded.length === 0) || isSaving || isUploading}>
                        {isSaving || isUploading ? "Đang lưu..." : "Lưu những thay đổi"}
                    </Button>
                    <Button variant="outline" onClick={() => setFiles([])} disabled={isSaving || isUploading}>
                        Xoá tệp mới chọn
                    </Button>
                    <div className="flex-1" />
                    <Button onClick={confirmSubmit} disabled={(uploaded.length === 0 && files.length === 0) || isSubmitting}>
                        {isSubmitting ? "Đang xác nhận..." : "Xác nhận nộp bài"}
                    </Button>
                </div>
            </Card>
        </div>
    );
}


