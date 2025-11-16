"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import PostCard, { PostItem } from "./PostCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
    useTeacherAnnouncements,
} from "@/hooks/use-teacher-announcements";
import {
    useStudentAnnouncements,
} from "@/hooks/use-student-announcements";
import {
    teacherAnnouncementDetailPath,
    studentAnnouncementDetailPath,
} from "@/utils/routing";

/**
 * Props cho component AnnouncementsFeed
 */
interface AnnouncementsFeedProps {
    /** ID của lớp học */
    classroomId: string;
    /** Role của người dùng: 'teacher' hoặc 'student' */
    role: "teacher" | "student";
    /** Kích thước trang khi fetch announcements (mặc định: 10) */
    pageSize?: number;
}

/**
 * Component chung hiển thị danh sách announcements cho cả teacher và student
 * Chỉ hiển thị nội dung bài viết, không có bình luận inline
 * 
 * @param props - Props của component
 * @returns JSX element hiển thị danh sách announcements
 */
export default function AnnouncementsFeed({
    classroomId,
    role,
    pageSize = 10,
}: AnnouncementsFeedProps) {
    // State cho pagination
    const [page, setPage] = useState(1);
    const sentinelRef = useRef<HTMLDivElement | null>(null);

    // Gọi hooks cố định để tuân thủ rules-of-hooks, sau đó chọn hook theo role
    const teacherHook = useTeacherAnnouncements();
    const studentHook = useStudentAnnouncements();

    const isTeacher = role === "teacher";
    const activeHook = isTeacher ? teacherHook : studentHook;

    // Lấy data từ hook tương ứng
    const announcements = activeHook.announcements || [];
    const isLoading = activeHook.isLoading || false;
    const error = activeHook.error || null;
    const pagination = activeHook.pagination || null;
    
    // Comments total để hiển thị số lượng
    const commentsTotal = activeHook.commentsTotal || {};

    // Fetch functions
    const fetchAnnouncements = activeHook.fetchAnnouncements;

    // Map announcements sang PostItem format
    const posts: PostItem[] = useMemo(() => {
        try {
            return announcements.map((ann) => ({
                id: ann.id,
                content: ann.content,
                createdAt: ann.createdAt,
                author: ann.author,
                attachments: ann.attachments?.map((att) => ({
                    id: att.id,
                    name: att.name,
                    size: att.size,
                    mimeType: att.mimeType,
                })),
                _count: ann._count,
            }));
        } catch (error) {
            console.error(`[ERROR] AnnouncementsFeed - Map announcements:`, error);
            return [];
        }
    }, [announcements]);

    // Tính toán pagination
    const totalPages = pagination?.totalPages ?? null;
    const hasMore = useMemo(
        () => (totalPages == null ? true : page < totalPages),
        [page, totalPages]
    );

    // Reset page khi classroomId thay đổi
    useEffect(() => {
        setPage(1);
    }, [classroomId]);

    // Fetch announcements khi classroomId hoặc page thay đổi
    useEffect(() => {
        if (classroomId && fetchAnnouncements) {
            try {
                console.log(`[INFO] AnnouncementsFeed - Fetching announcements for classroom ${classroomId}, page ${page}`);
                fetchAnnouncements(classroomId, page, pageSize);
            } catch (error) {
                console.error(`[ERROR] AnnouncementsFeed - Fetch announcements:`, error);
            }
        }
    }, [classroomId, page, pageSize, fetchAnnouncements]);

    // Infinite scroll với IntersectionObserver (student)
    useEffect(() => {
        if (role !== "student") return;
        if (!sentinelRef.current) return;
        if (!hasMore) return;

        const io = new IntersectionObserver(
            (entries) => {
                const [entry] = entries;
                if (entry.isIntersecting && !isLoading && fetchAnnouncements) {
                    try {
                        console.log(`[INFO] AnnouncementsFeed - Loading more announcements, page ${page + 1}`);
                        fetchAnnouncements(classroomId, page + 1, pageSize);
                        setPage(page + 1);
                    } catch (error) {
                        console.error(`[ERROR] AnnouncementsFeed - Load more:`, error);
                    }
                }
            },
            { threshold: 0.1 }
        );

        io.observe(sentinelRef.current);
        return () => io.disconnect();
    }, [role, hasMore, isLoading, page, classroomId, pageSize, fetchAnnouncements]);

    // Handler để load thêm trang (student - manual button)
    const handleLoadMore = () => {
        if (!fetchAnnouncements || isLoading || !hasMore) return;
        try {
            console.log(`[INFO] AnnouncementsFeed - Manual load more, page ${page + 1}`);
            fetchAnnouncements(classroomId, page + 1, pageSize);
            setPage(page + 1);
        } catch (error) {
            console.error(`[ERROR] AnnouncementsFeed - Manual load more:`, error);
        }
    };

    // Tạo detailUrl cho mỗi post
    const getDetailUrl = (announcementId: string): string => {
        if (role === "teacher") {
            return teacherAnnouncementDetailPath(classroomId, announcementId);
        } else {
            return studentAnnouncementDetailPath(classroomId, announcementId);
        }
    };

    return (
        <div className="space-y-4">
            {isLoading && posts.length === 0 ? (
                <div className="space-y-3">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                </div>
            ) : posts.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                    Chưa có thông báo nào.
                </div>
            ) : (
                <div className="space-y-4">
                    {posts.map((p) => (
                        <PostCard
                            key={p.id}
                            post={p}
                            commentsTotal={commentsTotal[p.id] || 0}
                            detailUrl={getDetailUrl(p.id)}
                        />
                    ))}
                    
                    {/* Sentinel cho infinite scroll (student) */}
                    {role === "student" && <div ref={sentinelRef} />}
                    
                    {/* Button load more (student - manual fallback) */}
                    {role === "student" && !isLoading && hasMore && (
                        <div className="flex justify-center">
                            <Button
                                variant="outline"
                                onClick={handleLoadMore}
                                disabled={isLoading}
                            >
                                {isLoading ? "Đang tải..." : "Tải thêm"}
                            </Button>
                        </div>
                    )}
                </div>
            )}
            
            {/* Hiển thị lỗi nếu có */}
            {error && (
                <div className="text-sm text-red-600 dark:text-red-400">
                    {error}
                </div>
            )}
        </div>
    );
}
