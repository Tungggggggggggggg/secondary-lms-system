"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
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
    const [isUploading, setIsUploading] = useState(false);

    const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const list = e.target.files ? Array.from(e.target.files) : [];
        setFiles(list);
    }, []);

    const totalSize = useMemo(() => files.reduce((s, f) => s + f.size, 0), [files]);

    const doUpload = useCallback(async () => {
        if (!files.length) return;
        setIsUploading(true);
        try {
            // Fetch current user id via Auth context-less RPC: getSession on supabase is not wired; rely on server register call
            // We upload to path using assignmentId and will let server validate ownership
            const uploaded: { fileName: string; mimeType: string; sizeBytes: number; storagePath: string }[] = [];
            for (const f of files) {
                if (f.size > MAX_FILE_SIZE) throw new Error(`${f.name} vượt quá 20MB`);
                if (f.type && !MIME_WHITELIST.has(f.type)) throw new Error(`${f.name} định dạng không hỗ trợ`);
                const form = new FormData();
                form.append("file", f);
                const resp = await fetch(`/api/submissions/upload?assignmentId=${assignmentId}`, { method: "POST", body: form });
                const j = await resp.json();
                if (!resp.ok || !j.success) throw new Error(j?.message || `Upload thất bại: ${f.name}`);
                uploaded.push(j.data);
            }

            // Register submission
            const res = await fetch(`/api/submissions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ assignmentId, files: uploaded }),
            });
            const json = await res.json();
            if (!res.ok) {
                throw new Error(json?.message || "Đăng ký nộp bài thất bại");
            }
            toast({ title: "Đã nộp bài", description: `Tải lên ${uploaded.length} file thành công` });
            router.push(`/dashboard/student/assignments/${assignmentId}`);
        } catch (e: any) {
            toast({ title: "Lỗi nộp bài", description: e.message || "Đã xảy ra lỗi", variant: "destructive" });
        } finally {
            setIsUploading(false);
        }
    }, [assignmentId, files, router, toast]);

    return (
        <div className="px-6 py-6">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold">Nộp bài bằng file</h1>
                <p className="text-sm text-gray-600">Chọn nhiều file (tối đa 20MB mỗi file). Định dạng: PDF, DOCX, DOC, TXT, PNG, JPEG, ZIP.</p>
            </div>
            <Card className="p-4">
                <Input type="file" multiple onChange={onFileChange} />
                <div className="mt-3 text-sm text-gray-600">
                    Đã chọn {files.length} file, tổng dung lượng {(totalSize / (1024 * 1024)).toFixed(2)} MB
                </div>
                <div className="mt-4 flex gap-2">
                    <Button onClick={doUpload} disabled={!files.length || isUploading}>
                        {isUploading ? "Đang tải lên..." : "Nộp bài"}
                    </Button>
                    <Button variant="outline" onClick={() => setFiles([])} disabled={isUploading}>
                        Xoá chọn
                    </Button>
                </div>
            </Card>
        </div>
    );
}


