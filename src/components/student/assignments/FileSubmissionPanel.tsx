"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "lms-submissions";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

const MIME_WHITELIST = new Set([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "text/plain",
    "image/png",
    "image/jpeg",
    "application/zip",
]);

export default function FileSubmissionPanel({ assignmentId }: { assignmentId: string }) {
    const { toast } = useToast();
    const [files, setFiles] = useState<File[]>([]);
    const [uploaded, setUploaded] = useState<{ fileName: string; mimeType: string; sizeBytes: number; storagePath: string }[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [status, setStatus] = useState<"draft" | "submitted" | null>(null);
    const [editOpen, setEditOpen] = useState(false);
    const [editType, setEditType] = useState<"new" | "uploaded">("new");
    const [editIndex, setEditIndex] = useState<number>(-1);
    const [editName, setEditName] = useState<string>("");
    const [signedUrlByPath, setSignedUrlByPath] = useState<Record<string, string>>({});

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

    // Preview URL cho file mới chọn
    const previewFor = (file: File) => URL.createObjectURL(file);
    const isImageByName = (name?: string) => {
        if (!name) return false;
        const lower = name.toLowerCase();
        return [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"].some((ext) => lower.endsWith(ext));
    };
    const publicUrlForStored = (storagePath: string) => {
        const clean = storagePath.replace(/^\//, "");
        if (SUPABASE_URL) return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${clean}`;
        return `/storage/v1/object/public/${BUCKET}/${clean}`;
    };

    const fetchSignedUrl = useCallback(async (path: string) => {
        try {
            const res = await fetch(`/api/submissions/signed-url?path=${encodeURIComponent(path)}`);
            const j = await res.json();
            if (res.ok && j?.success && j.data?.url) {
                setSignedUrlByPath((prev) => ({ ...prev, [path]: j.data.url }));
                return j.data.url as string;
            }
        } catch {}
        return "";
    }, []);

    // Compute preview url for edit modal (placed after helper declarations)
    const editPreviewUrl = useMemo(() => {
        if (!editOpen || editIndex < 0) return "";
        if (editType === "new") {
            const f = files[editIndex];
            if (!f) return "";
            if (f.type?.startsWith("image/") || isImageByName(f.name)) return previewFor(f);
            return "";
        }
        const f = uploaded[editIndex];
        if (!f) return "";
        if (f.mimeType?.startsWith("image/") || isImageByName(f.fileName) || isImageByName(f.storagePath)) {
            // Prefer signed URL (private buckets). Fallback to public URL if env allows.
            return signedUrlByPath[f.storagePath] || publicUrlForStored(f.storagePath);
        }
        return "";
    }, [editOpen, editIndex, editType, files, uploaded, signedUrlByPath]);

    const handleDownloadCurrent = useCallback(async () => {
        try {
            let url = "";
            let filename = "download";
            if (editType === "new") {
                const f = files[editIndex];
                if (!f) return;
                url = URL.createObjectURL(f);
                filename = f.name;
            } else {
                const f = uploaded[editIndex];
                if (!f) return;
                filename = f.fileName || "download";
                url = signedUrlByPath[f.storagePath] || (await fetchSignedUrl(f.storagePath)) || publicUrlForStored(f.storagePath);
            }
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            a.target = "_blank";
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch {}
    }, [editIndex, editType, files, uploaded, signedUrlByPath, fetchSignedUrl]);

    const openEditForNew = (idx: number) => {
        const f = files[idx];
        setEditName(f?.name || "");
        setEditType("new");
        setEditIndex(idx);
        setEditOpen(true);
    };

    const openEditForUploaded = (idx: number) => {
        const f = uploaded[idx];
        setEditName(f?.fileName || "");
        setEditType("uploaded");
        setEditIndex(idx);
        setEditOpen(true);
    };

    const applyEdit = () => {
        if (editIndex < 0 || !editName.trim()) {
            setEditOpen(false);
            return;
        }
        if (editType === "new") {
            const f = files[editIndex];
            if (f) {
                const renamed = new File([f], editName.trim(), { type: f.type });
                const next = [...files];
                next[editIndex] = renamed;
                setFiles(next);
            }
        } else {
            const next = [...uploaded];
            next[editIndex] = { ...next[editIndex], fileName: editName.trim() };
            setUploaded(next);
        }
        setEditOpen(false);
    };

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
            // Prefetch signed URLs for any images just uploaded so preview works immediately
            const newImages = allFiles.filter((f) => f?.mimeType?.startsWith("image/") || isImageByName(f?.fileName) || isImageByName(f?.storagePath));
            await Promise.all(newImages.map((f) => fetchSignedUrl(f.storagePath)));
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
            setStatus("submitted");
        } catch (e: any) {
            toast({ title: "Lỗi nộp bài", description: e.message || "Đã xảy ra lỗi", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    }, [assignmentId, files.length, saveDraft, toast, uploaded.length]);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`/api/submissions?assignmentId=${assignmentId}`);
                const j = await res.json();
                if (res.ok && j?.data) {
                    setUploaded(j.data.files || []);
                    setStatus(j.data.status || "draft");
                    // proactively fetch signed urls for image files
                    const imgs = (j.data.files || []).filter((f: any) => f?.mimeType?.startsWith("image/") || isImageByName(f?.fileName) || isImageByName(f?.storagePath));
                    await Promise.all(imgs.map((f: any) => fetchSignedUrl(f.storagePath)));
                }
            } catch {}
        })();
    }, [assignmentId, fetchSignedUrl]);

    return (
        <Card className="p-4">
            <div
                className="border-2 border-dashed rounded-xl p-5 text-center text-sm text-gray-600 bg-white/70 backdrop-blur transition-colors hover:bg-gray-50 hover:border-gray-400"
                onDrop={onDrop}
                onDragOver={onDragOver}
            >
                {files.length === 0 && uploaded.length === 0 ? (
                    <div>
                        Kéo thả tệp vào đây hoặc
                        <div className="mt-2 flex justify-center">
                            <Input type="file" multiple onChange={onFileChange} className="w-auto" />
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {uploaded.map((f, idx) => (
                            <div key={`u-${idx}`} className="border rounded-lg p-2 cursor-pointer bg-white shadow-sm hover:shadow-md hover:bg-gray-50 transition" onClick={() => openEditForUploaded(idx)}>
                                <div className="aspect-video bg-gray-50 flex items-center justify-center overflow-hidden rounded">
                                    {(f.mimeType?.startsWith("image/") || isImageByName(f.fileName) || isImageByName(f.storagePath)) ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={signedUrlByPath[f.storagePath] || publicUrlForStored(f.storagePath)} alt={f.fileName} className="object-cover w-full h-full" />
                                    ) : (
                                        <div className="text-xs text-gray-500">{f.mimeType || "file"}</div>
                                    )}
                                </div>
                                <div className="mt-2 text-xs truncate" title={f.fileName}>{f.fileName}</div>
                            </div>
                        ))}
                        {files.map((f, idx) => (
                            <div key={`n-${idx}`} className="border rounded-lg p-2 cursor-pointer bg-white shadow-sm hover:shadow-md hover:bg-gray-50 transition" onClick={() => openEditForNew(idx)}>
                                <div className="aspect-video bg-gray-50 flex items-center justify-center overflow-hidden rounded">
                                    {(f.type.startsWith("image/") || isImageByName(f.name)) ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={previewFor(f)} alt={f.name} className="object-cover w-full h-full" />
                                    ) : (
                                        <div className="text-xs text-gray-500">{f.type || "file"}</div>
                                    )}
                                </div>
                                <div className="mt-2 text-xs truncate" title={f.name}>{f.name}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="mt-4">
                <div className="text-sm font-medium">Đã thêm mới: {files.length} file</div>
                <div className="text-xs text-gray-500">Tổng {(totalSize / (1024 * 1024)).toFixed(2)} MB</div>
            </div>

            {/* Đã gộp hiển thị bản nháp vào khung kéo-thả phía trên */}

            <div className="mt-6 flex gap-2">
                <Button onClick={saveDraft} disabled={(files.length === 0 && uploaded.length === 0) || isSaving || isUploading}>
                    {isSaving || isUploading ? "Đang lưu..." : "Lưu những thay đổi"}
                </Button>
                <Button variant="outline" onClick={() => setFiles([])} disabled={isSaving || isUploading}>
                    Xoá tệp mới chọn
                </Button>
                <div className="flex-1" />
                <Button onClick={confirmSubmit} disabled={(uploaded.length === 0 && files.length === 0) || isSubmitting || status === "submitted"}>
                    {isSubmitting ? "Đang xác nhận..." : (status === "submitted" ? "Đã nộp bài" : "Xác nhận nộp bài")}
                </Button>
            </div>

            {/* Edit dialog - modern layout */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="md:max-w-3xl p-0 overflow-hidden rounded-2xl" onClose={() => setEditOpen(false)}>
                    <div className="md:grid md:grid-cols-2">
                        {/* Preview */}
                        <div className="relative bg-gray-50 p-5 flex items-center justify-center">
                            {editPreviewUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={editPreviewUrl} alt="preview" className="max-h-80 rounded-lg shadow object-contain" />
                            ) : (
                                <div className="text-xs text-gray-500">Không có bản xem trước</div>
                            )}
                        </div>

                        {/* Form */}
                        <div className="p-6 space-y-4">
                            <DialogHeader className="p-0">
                                <DialogTitle className="text-lg">Chỉnh sửa tệp</DialogTitle>
                            </DialogHeader>
                            <p className="text-xs text-gray-500">Đặt lại tên hiển thị trước khi lưu nháp hoặc nộp.</p>

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-700">Tên tệp</label>
                                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                            </div>

                            <DialogFooter className="gap-2 sm:justify-between">
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={handleDownloadCurrent}
                                    >
                                        Tải xuống
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            if (editIndex >= 0) {
                                                if (editType === "new") {
                                                    setFiles((prev) => prev.filter((_, i) => i !== editIndex));
                                                } else {
                                                    setUploaded((prev) => prev.filter((_, i) => i !== editIndex));
                                                }
                                            }
                                            setEditOpen(false);
                                        }}
                                    >
                                        Xóa tệp
                                    </Button>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={() => setEditOpen(false)}>Hủy</Button>
                                    <Button onClick={applyEdit}>Cập nhật</Button>
                                </div>
                            </DialogFooter>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
    );
}


