"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import PostCard, { PostItem } from "@/components/classroom/newsfeed/PostCard";
import PostCardSkeleton from "./PostCardSkeleton";
import { EmptyState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import PostActions from "./PostActions";
import { Megaphone } from "lucide-react";
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
type FeedFilters = {
    q?: string;
    sort?: "new" | "comments" | "attachments";
    hasAttachment?: boolean;
};

interface AnnouncementsFeedProps {
    /** ID của lớp học */
    classroomId: string;
    /** Role của người dùng: 'teacher' hoặc 'student' */
    role: "teacher" | "student";
    /** Kích thước trang khi fetch announcements (mặc định: 10) */
    pageSize?: number;
    /** Bộ lọc client-side cho feed */
    filters?: FeedFilters;
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
    filters,
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
                pinnedAt: (ann as any).pinnedAt ?? null,
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

    // Lọc & sắp xếp client-side cho UI mượt mà
    const displayPosts = useMemo(() => {
        let data = [...posts];
        const q = filters?.q?.toLowerCase()?.trim();
        if (q) {
            data = data.filter((p) =>
                (p.content || "").toLowerCase().includes(q) ||
                (p.author?.fullname || "").toLowerCase().includes(q)
            );
        }
        if (filters?.hasAttachment) {
            data = data.filter((p) => (p.attachments?.length || 0) > 0);
        }
        const sort = filters?.sort || "new";
        const pinned = data.filter((p) => !!p.pinnedAt);
        const unpinned = data.filter((p) => !p.pinnedAt);
        const sorter = (a: PostItem, b: PostItem) => {
            if (sort === "comments") {
                return (b._count?.comments || 0) - (a._count?.comments || 0);
            } else if (sort === "attachments") {
                return (b.attachments?.length || 0) - (a.attachments?.length || 0);
            }
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        };
        pinned.sort(sorter);
        unpinned.sort(sorter);
        return [...pinned, ...unpinned];
    }, [posts, filters]);

    // Tính toán pagination
    const totalPages = pagination?.totalPages ?? null;
    const hasMore = useMemo(
        () => (totalPages == null ? true : page < totalPages),
        [page, totalPages]
    );

    // Reset page khi classroomId hoặc filters thay đổi
    useEffect(() => {
        setPage(1);
    }, [classroomId, filters?.q, filters?.sort, filters?.hasAttachment]);

    // Fetch announcements khi classroomId/page/filters thay đổi
    useEffect(() => {
        if (classroomId && fetchAnnouncements) {
            try {
                console.log(`[INFO] AnnouncementsFeed - Fetching announcements for classroom ${classroomId}, page ${page}`);
                fetchAnnouncements(classroomId, page, pageSize, filters);
            } catch (error) {
                console.error(`[ERROR] AnnouncementsFeed - Fetch announcements:`, error);
            }
        }
    }, [classroomId, page, pageSize, fetchAnnouncements, filters]);

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
                        fetchAnnouncements(classroomId, page + 1, pageSize, filters);
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
            fetchAnnouncements(classroomId, page + 1, pageSize, filters);
            setPage(page + 1);
        } catch (error) {
            console.error(`[ERROR] AnnouncementsFeed - Manual load more:`, error);
        }
    };

    const handlePin = async (id: string, pin: boolean) => {
        if (role !== "teacher") return;
        try {
            const res = await fetch(`/api/announcements/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pin }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.message || "Ghim/Bỏ ghim thất bại");
            setPage(1);
            fetchAnnouncements?.(classroomId, 1, pageSize, filters);
        } catch (e) {
            console.error(`[ERROR] Pin announcement ${id}:`, e);
            alert("Không thể ghim/bỏ ghim");
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

    // Teacher-only actions
    const handleEdit = async (id: string) => {
        if (role !== "teacher") return;
        const current = announcements.find((a) => a.id === id);
        const nextContent = window.prompt("Chỉnh sửa nội dung thông báo:", current?.content || "");
        if (nextContent == null) return;
        const content = nextContent.trim();
        if (!content) return;
        try {
            const res = await fetch(`/api/announcements/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.message || "Cập nhật thất bại");
            // Refresh về trang 1 theo filters hiện tại
            setPage(1);
            fetchAnnouncements?.(classroomId, 1, pageSize, filters);
        } catch (e) {
            console.error(`[ERROR] Edit announcement ${id}:`, e);
            alert("Không thể cập nhật thông báo");
        }
    };

    const handleDelete = async (id: string) => {
        if (role !== "teacher") return;
        const ok = window.confirm("Bạn có chắc muốn xóa thông báo này?");
        if (!ok) return;
        try {
            const res = await fetch(`/api/announcements/${id}`, { method: "DELETE" });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.message || "Xóa thất bại");
            // Refresh về trang 1 theo filters hiện tại
            setPage(1);
            fetchAnnouncements?.(classroomId, 1, pageSize, filters);
        } catch (e) {
            console.error(`[ERROR] Delete announcement ${id}:`, e);
            alert("Không thể xóa thông báo");
        }
    };

    return (
        <div className="space-y-4">
            {isLoading && posts.length === 0 ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <PostCardSkeleton key={i} />
                    ))}
                </div>
            ) : displayPosts.length === 0 ? (
                <EmptyState
                    title="Chưa có thông báo nào"
                    description={
                        filters?.q || filters?.hasAttachment
                            ? "Không tìm thấy kết quả phù hợp với bộ lọc."
                            : "Khi giáo viên đăng thông báo mới, chúng sẽ hiển thị tại đây."
                    }
                    variant="teacher"
                    icon={<Megaphone className="h-12 w-12 text-blue-600" />}
                />
            ) : (
                <div className="space-y-4">
                    {displayPosts.map((p) => (
                        <PostCard
                            key={p.id}
                            post={p}
                            commentsTotal={commentsTotal[p.id] || 0}
                            detailUrl={getDetailUrl(p.id)}
                            actions={
                                role === "teacher" ? (
                                    <PostActions
                                        post={p}
                                        onPin={handlePin}
                                        onEdit={handleEdit}
                                        onDelete={handleDelete}
                                    />
                                ) : undefined
                            }
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
                                className="rounded-full px-5"
                            >
                                {isLoading ? "Đang tải..." : "Tải thêm"}
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* Hiển thị lỗi nếu có */}
            {error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                </div>
            )}
        </div>
    );
}
