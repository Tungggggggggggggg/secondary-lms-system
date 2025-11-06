"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import gsap from "gsap";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useTeacherAnnouncements } from "@/hooks/use-teacher-announcements";
import { useLessons } from "@/hooks/use-lessons";
import AnnouncementsFeed from "@/components/newsfeed/AnnouncementsFeed";

/**
 * Component tổng quan lớp học cho giáo viên
 * Hiển thị phần đăng bài và danh sách announcements
 */
export default function ClassroomOverview() {
    const rootRef = useRef<HTMLDivElement>(null);
    const params = useParams();
    const classroomId = params.classroomId as string;

    // Hook để tạo announcement mới (chỉ giáo viên mới có)
    const { createAnnouncement, fetchAnnouncements } = useTeacherAnnouncements();
    const { uploadToAnnouncement } = useLessons();

    // State cho phần đăng bài
    const [content, setContent] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    // Key để force refresh AnnouncementsFeed sau khi đăng bài
    const [refreshKey, setRefreshKey] = useState(0);

    // Animation khi component mount hoặc announcements thay đổi
    useEffect(() => {
        if (!rootRef.current) return;
        try {
            gsap.fromTo(
                rootRef.current.querySelectorAll("h2, div[class*='rounded']"),
                { opacity: 0, y: 10 },
                { opacity: 1, y: 0, duration: 0.4, stagger: 0.08, ease: "power1.out" }
            );
        } catch (error) {
            console.error(`[ERROR] ClassroomOverview - GSAP animation:`, error);
        }
    }, [classroomId]);

    // Kiểm tra có thể đăng bài hay không
    const canPost = useMemo(
        () => !!classroomId && content.trim().length > 0,
        [classroomId, content]
    );

    /**
     * Handler để đăng bài mới
     */
    async function handlePost() {
        if (!classroomId || !content.trim()) {
            console.warn(`[WARN] ClassroomOverview - Cannot post: classroomId or content missing`);
            return;
        }

        try {
            console.log(`[INFO] ClassroomOverview - Creating announcement for classroom ${classroomId}`);
            
            // Tạo announcement
            const created = await createAnnouncement(classroomId, content.trim());
            
            if (!created) {
                console.error(`[ERROR] ClassroomOverview - Failed to create announcement`);
                return;
            }

            // Upload files nếu có
            if (created && files.length > 0) {
                console.log(`[INFO] ClassroomOverview - Uploading ${files.length} files to announcement ${created.id}`);
                await uploadToAnnouncement(created.id, files);
                
                // Refresh danh sách announcements sẽ được AnnouncementsFeed tự động xử lý
            }

            // Reset form
            setContent("");
            setFiles([]);
            
            // Trigger refresh AnnouncementsFeed
            setRefreshKey((prev) => prev + 1);
            
            console.log(`[INFO] ClassroomOverview - Successfully posted announcement`);
        } catch (error) {
            console.error(`[ERROR] ClassroomOverview - Handle post:`, error);
        }
    }

    return (
        <div ref={rootRef} className="space-y-4">
            {/* Title giống như student */}
            <h2 className="text-lg font-semibold">Bảng tin</h2>

            {/* Form đăng bài (chỉ giáo viên mới có) - Card riêng */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-5 shadow-sm">
                <div className="space-y-4">
                    <Textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Chia sẻ thông báo cho lớp..."
                        className="min-h-[120px] text-base"
                    />
                    <div className="flex items-center gap-3">
                        <label className="cursor-pointer">
                            <input
                                type="file"
                                multiple
                                onChange={(e) =>
                                    setFiles(e.target.files ? Array.from(e.target.files) : [])
                                }
                                className="hidden"
                                id="file-input"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                className="text-sm"
                                onClick={() => document.getElementById("file-input")?.click()}
                            >
                                Chọn tệp
                            </Button>
                        </label>
                        {files.length > 0 && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                {files.length} tệp đã chọn
                            </span>
                        )}
                        <Button
                            onClick={handlePost}
                            disabled={!canPost}
                            className="ml-auto"
                        >
                            Đăng
                        </Button>
                    </div>
                    {files.length > 0 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-lg p-2">
                            <span className="font-medium">Đính kèm: </span>
                            {files.map((f, idx) => (
                                <span key={idx}>
                                    {f.name}
                                    {idx < files.length - 1 ? ", " : ""}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Component chung hiển thị announcements */}
            {classroomId && (
                <AnnouncementsFeed
                    key={`${classroomId}-${refreshKey}`}
                    classroomId={classroomId}
                    role="teacher"
                    pageSize={10}
                />
            )}
        </div>
    );
}
