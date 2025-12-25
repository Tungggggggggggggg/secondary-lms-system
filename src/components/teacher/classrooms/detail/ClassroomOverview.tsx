"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import gsap from "gsap";
import { useTeacherAnnouncements } from "@/hooks/use-teacher-announcements";
import { useLessons } from "@/hooks/use-lessons";
import AnnouncementsFeed from "@/components/classroom/newsfeed/AnnouncementsFeed";
import AnnouncementComposer from "@/components/classroom/newsfeed/AnnouncementComposer";
import FeedToolbar, { FeedToolbarValue } from "@/components/classroom/newsfeed/FeedToolbar";

/**
 * Component tổng quan lớp học cho giáo viên
 * Hiển thị phần đăng bài và danh sách announcements
 */
export default function ClassroomOverview() {
    const rootRef = useRef<HTMLDivElement>(null);
    const params = useParams();
    const classroomId = params.classroomId as string;

    // Hook để tạo announcement mới (chỉ giáo viên mới có)
    const { createAnnouncement } = useTeacherAnnouncements();
    const { uploadToAnnouncement } = useLessons();

    // Key để force refresh AnnouncementsFeed sau khi đăng bài
    const [refreshKey, setRefreshKey] = useState(0);
    // Bộ lọc client-side cho feed
    const [filters, setFilters] = useState<FeedToolbarValue>({ q: "", sort: "new", hasAttachment: false });

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

    // Submit bài mới từ composer
    async function handleSubmit(content: string, files: File[]) {
        if (!classroomId || !content.trim()) return;
        try {
            const created = await createAnnouncement(classroomId, content.trim());
            if (!created) return;
            if (files.length > 0) {
                await uploadToAnnouncement(created.id, files);
            }
            setRefreshKey((prev) => prev + 1);
        } catch (error) {
            console.error(`[ERROR] ClassroomOverview - Handle post:`, error);
        }
    }

    return (
        <div ref={rootRef} className="space-y-4">
            {/* Title giống như student */}
            <h2 className="text-lg font-semibold">Bảng tin</h2>

            {/* Form đăng bài (chỉ giáo viên) */}
            <AnnouncementComposer onSubmit={handleSubmit} />

            {/* Toolbar lọc/sắp xếp cho feed */}
            <FeedToolbar value={filters} onChange={setFilters} />

            {/* Component chung hiển thị announcements */}
            {classroomId && (
                <AnnouncementsFeed
                    key={`${classroomId}-${refreshKey}`}
                    classroomId={classroomId}
                    role="teacher"
                    pageSize={10}
                    filters={filters}
                />
            )}
        </div>
    );
}
