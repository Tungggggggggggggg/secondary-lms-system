"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import gsap from "gsap";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTeacherAnnouncements } from "@/hooks/use-teacher-announcements";
import { useLessons } from "@/hooks/use-lessons";

export default function ClassroomOverview() {
    const rootRef = useRef<HTMLDivElement>(null);
    const params = useParams();
    const classroomId = params.classroomId as string;

    const { announcements, isLoading, fetchAnnouncements, createAnnouncement, addComment } = useTeacherAnnouncements();
    const { uploadToAnnouncement } = useLessons();

    const [content, setContent] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!rootRef.current) return;
        gsap.fromTo(
            rootRef.current.querySelectorAll("section,aside"),
            { opacity: 0, y: 10 },
            { opacity: 1, y: 0, duration: 0.4, stagger: 0.08, ease: "power1.out" }
        );
    }, [announcements]);

    useEffect(() => {
        if (classroomId) fetchAnnouncements(classroomId, 1, 10);
    }, [classroomId, fetchAnnouncements]);

    const canPost = useMemo(() => !!classroomId && content.trim().length > 0, [classroomId, content]);

    async function handlePost() {
        if (!classroomId || !content.trim()) return;
        const created = await createAnnouncement(classroomId, content.trim());
        if (created && files.length > 0) {
            await uploadToAnnouncement(created.id, files);
            await fetchAnnouncements(classroomId, 1, 10);
        }
        setContent("");
        setFiles([]);
    }

    async function handleAddComment(announcementId: string) {
        const text = (commentDraft[announcementId] || "").trim();
        if (!text) return;
        const ok = await addComment(announcementId, text);
        if (ok && classroomId) {
            setCommentDraft((prev) => ({ ...prev, [announcementId]: "" }));
            await fetchAnnouncements(classroomId, 1, 10);
        }
    }

    return (
        <div ref={rootRef} className="grid gap-6 md:grid-cols-3">
            <section className="md:col-span-2 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                <h2 className="text-base font-semibold mb-3">Bảng tin</h2>

                <div className="mb-4 space-y-3">
                    <Textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Chia sẻ thông báo cho lớp..."
                    />
                    <div className="flex items-center gap-3">
                        <input
                            type="file"
                            multiple
                            onChange={(e) => setFiles(e.target.files ? Array.from(e.target.files) : [])}
                        />
                        <Button onClick={handlePost} disabled={!canPost}>
                            Đăng
                        </Button>
                    </div>
                    {files.length > 0 && (
                        <div className="text-xs text-gray-500">
                            Đính kèm: {files.map((f) => f.name).join(", ")}
                        </div>
                    )}
                </div>

                {isLoading ? (
                    <div className="space-y-3">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {announcements.map((a) => (
                            <div key={a.id} className="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                                <div className="text-sm text-gray-600 mb-2">
                                    <span className="font-semibold">{a.author?.fullname || "Giáo viên"}</span>
                                    <span className="ml-2">•</span>
                                    <span className="ml-2">{new Date(a.createdAt).toLocaleString()}</span>
                                </div>
                                <div className="whitespace-pre-line text-gray-800 mb-3">{a.content}</div>
                                {a.attachments && a.attachments.length > 0 && (
                                    <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 mb-3">
                                        <div className="font-medium mb-1">Đính kèm</div>
                                        <ul className="list-disc ml-5">
                                            {a.attachments.map((f) => (
                                                <li key={f.id} className="break-all">
                                                    {f.name} <span className="text-xs text-gray-400">({Math.round(f.size/1024)} KB)</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <Textarea
                                        value={commentDraft[a.id] || ""}
                                        onChange={(e) => setCommentDraft((prev) => ({ ...prev, [a.id]: e.target.value }))}
                                        placeholder="Viết bình luận..."
                                        className="min-h-[60px]"
                                    />
                                    <Button onClick={() => handleAddComment(a.id)}>Gửi</Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
            <aside className="rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                <h3 className="text-base font-semibold mb-3">Sắp tới</h3>
                <div className="text-sm text-gray-500">Chưa có hoạt động nào nhé~</div>
            </aside>
        </div>
    );
}
