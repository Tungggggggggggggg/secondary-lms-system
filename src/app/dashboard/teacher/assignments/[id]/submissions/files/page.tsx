"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";

interface FileSubmissionItem {
    id: string;
    submittedAt: string;
    filesCount: number;
    student: { id: string; fullname: string; email: string };
}

export default function FileSubmissionsPage() {
    const params = useParams() as { id: string };
    const assignmentId = params.id;
    const [items, setItems] = useState<FileSubmissionItem[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const run = async () => {
            setLoading(true);
            try {
                const resp = await fetch(`/api/assignments/${assignmentId}/file-submissions`);
                const j = await resp.json();
                if (j.success) setItems(j.data);
            } finally {
                setLoading(false);
            }
        };
        if (assignmentId) run();
    }, [assignmentId]);

    return (
        <div className="px-6 py-6">
            <h1 className="text-2xl font-semibold mb-4">Bài nộp dạng file</h1>
            {loading ? (
                <div>Đang tải...</div>
            ) : items.length === 0 ? (
                <div>Chưa có bài nộp.</div>
            ) : (
                <div className="space-y-3">
                    {items.map((it) => (
                        <div key={it.id} className="border rounded-md p-4 flex items-center justify-between">
                            <div>
                                <div className="font-medium">{it.student.fullname}</div>
                                <div className="text-sm text-gray-600">{new Date(it.submittedAt).toLocaleString()}</div>
                                <div className="text-sm">Số file: {it.filesCount}</div>
                            </div>
                            <Button
                                onClick={async () => {
                                    const r = await fetch(`/api/submissions/${it.id}/files`);
                                    const j = await r.json();
                                    if (j.success) {
                                        for (const f of j.data.files) {
                                            if (f.url) window.open(f.url, "_blank");
                                        }
                                    }
                                }}
                            >
                                Tải tất cả
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}


