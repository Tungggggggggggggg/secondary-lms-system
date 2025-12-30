"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import PostCard, { PostItem } from "@/components/classroom/newsfeed/PostCard";
import PostCardSkeleton from "./PostCardSkeleton";
import { EmptyState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
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
    sort?: "new" | "oldest" | "comments" | "attachments";
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
    const [pinnedOverrides, setPinnedOverrides] = useState<Record<string, string | null>>({});
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingPostId, setEditingPostId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState("");
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
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

    const stableFilters = useMemo(() => filters, [
        filters?.q,
        filters?.sort,
        filters?.hasAttachment,
    ]);

    // Map announcements sang PostItem format
    const posts: PostItem[] = useMemo(() => {
        try {
            return announcements.map((ann) => {
                const override = pinnedOverrides[ann.id];
                const effectivePinnedAt =
                    typeof override !== "undefined" ? override : ann.pinnedAt ?? null;

                return {
                    id: ann.id,
                    content: ann.content,
                    createdAt: ann.createdAt,
                    author: ann.author,
                    pinnedAt: effectivePinnedAt,
                    attachments: ann.attachments?.map((att) => ({
                        id: att.id,
                        name: att.name,
                        size: att.size,
                        mimeType: att.mimeType,
                    })),
                    _count: ann._count,
                };
            });
        } catch (error) {
            console.error(`[ERROR] AnnouncementsFeed - Map announcements:`, error);
            return [];
        }
    }, [announcements, pinnedOverrides]);

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
            } else if (sort === "oldest") {
                return (
                    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                );
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
    }, [classroomId, stableFilters?.q, stableFilters?.sort, stableFilters?.hasAttachment]);

    // Fetch announcements khi classroomId/page/filters thay đổi
    useEffect(() => {
        if (classroomId && fetchAnnouncements) {
            try {
                console.log(`[INFO] AnnouncementsFeed - Fetching announcements for classroom ${classroomId}, page ${page}`);
                fetchAnnouncements(classroomId, page, pageSize, stableFilters);
            } catch (error) {
                console.error(`[ERROR] AnnouncementsFeed - Fetch announcements:`, error);
            }
        }
    }, [classroomId, page, pageSize, fetchAnnouncements, stableFilters]);

    // Infinite scroll với IntersectionObserver (student)
    useEffect(() => {
        if (role !== "student") return;
        if (!sentinelRef.current) return;
        if (!hasMore) return;

        const io = new IntersectionObserver(
            (entries) => {
                const [entry] = entries;
                if (entry.isIntersecting && !isLoading) {
                    try {
                        console.log(`[INFO] AnnouncementsFeed - Loading more announcements, page ${page + 1}`);
                        setPage((prev) => prev + 1);
                    } catch (error) {
                        console.error(`[ERROR] AnnouncementsFeed - Load more:`, error);
                    }
                }
            },
            { threshold: 0.1 }
        );

        io.observe(sentinelRef.current);
        return () => io.disconnect();
    }, [role, hasMore, isLoading, page, classroomId, pageSize]);

    // Handler để load thêm trang (student - manual button)
    const handleLoadMore = () => {
        if (isLoading || !hasMore) return;
        try {
            console.log(`[INFO] AnnouncementsFeed - Manual load more, page ${page + 1}`);
            setPage((prev) => prev + 1);
        } catch (error) {
            console.error(`[ERROR] AnnouncementsFeed - Manual load more:`, error);
        }
    };

    const handlePin = async (id: string, pin: boolean) => {
        if (role !== "teacher") return;

        const optimisticPinnedAt = pin ? new Date().toISOString() : null;
        setPinnedOverrides((prev) => ({ ...prev, [id]: optimisticPinnedAt }));

        try {
            const res = await fetch(`/api/announcements/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pin }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.message || "Ghim/Bỏ ghim thất bại");
            setPage(1);
            if (fetchAnnouncements) {
                await fetchAnnouncements(classroomId, 1, pageSize, filters);
            }

            setPinnedOverrides((prev) => {
                const next = { ...prev };
                delete next[id];
                return next;
            });
        } catch (e) {
            console.error(`[ERROR] Pin announcement ${id}:`, e);
            setPinnedOverrides((prev) => {
                const next = { ...prev };
                delete next[id];
                return next;
            });
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
    const handleEdit = (id: string) => {
        if (role !== "teacher") return;
        const currentPost = posts.find((p) => p.id === id);
        setEditingPostId(id);
        setEditContent(currentPost?.content || "");
        setEditDialogOpen(true);
    };

    const handleEditCancel = () => {
        if (isSavingEdit) return;
        setEditDialogOpen(false);
        setEditingPostId(null);
    };

    const handleEditConfirm = async () => {
        if (role !== "teacher" || !editingPostId) return;
        const content = editContent.trim();
        if (!content) return;
        try {
            setIsSavingEdit(true);
            const res = await fetch(`/api/announcements/${editingPostId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.message || "Cập nhật thất bại");
            // Refresh về trang 1 theo filters hiện tại
            setPage(1);
            if (fetchAnnouncements) {
                await fetchAnnouncements(classroomId, 1, pageSize, filters);
            }
            setEditDialogOpen(false);
            setEditingPostId(null);
        } catch (e) {
            console.error(`[ERROR] Edit announcement ${editingPostId}:`, e);
            alert("Không thể cập nhật thông báo");
        } finally {
            setIsSavingEdit(false);
        }
    };

    const handleDelete = (id: string) => {
        if (role !== "teacher") return;
        setDeletingPostId(id);
        setDeleteDialogOpen(true);
    };

    const handleDeleteCancel = () => {
        if (isDeleting) return;
        setDeleteDialogOpen(false);
        setDeletingPostId(null);
    };

    const handleDeleteConfirm = async () => {
        if (role !== "teacher" || !deletingPostId) return;
        const id = deletingPostId;
        try {
            setIsDeleting(true);
            const res = await fetch(`/api/announcements/${id}`, { method: "DELETE" });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.message || "Xóa thất bại");
            // Refresh về trang 1 theo filters hiện tại
            setPage(1);
            if (fetchAnnouncements) {
                await fetchAnnouncements(classroomId, 1, pageSize, filters);
            }
            setDeleteDialogOpen(false);
            setDeletingPostId(null);
        } catch (e) {
            console.error(`[ERROR] Delete announcement ${id}:`, e);
            alert("Không thể xóa thông báo");
        } finally {
            setIsDeleting(false);
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

            {/* Dialog chỉnh sửa thông báo */}
            <Dialog
                open={editDialogOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        handleEditCancel();
                    }
                }}
            >
                <DialogContent onClose={handleEditCancel}>
                    <DialogHeader variant="teacher">
                        <DialogTitle variant="teacher">Chỉnh sửa thông báo</DialogTitle>
                        <DialogDescription variant="teacher">
                            Cập nhật nội dung thông báo cho lớp học.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="px-6 py-4">
                        <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            placeholder="Nhập nội dung thông báo..."
                            className="min-h-[140px] text-sm sm:text-base"
                            disabled={isSavingEdit}
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={handleEditCancel}
                            disabled={isSavingEdit}
                        >
                            Hủy
                        </Button>
                        <Button
                            onClick={handleEditConfirm}
                            disabled={isSavingEdit || !editContent.trim()}
                        >
                            {isSavingEdit ? "Đang lưu..." : "Lưu thay đổi"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog xác nhận xóa thông báo */}
            <Dialog
                open={deleteDialogOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        handleDeleteCancel();
                    }
                }}
            >
                <DialogContent onClose={handleDeleteCancel}>
                    <DialogHeader variant="teacher">
                        <DialogTitle variant="teacher">Xóa thông báo</DialogTitle>
                        <DialogDescription variant="teacher">
                            Bạn có chắc chắn muốn xóa thông báo này? Hành động này không thể hoàn tác.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={handleDeleteCancel}
                            disabled={isDeleting}
                        >
                            Hủy
                        </Button>
                        <Button
                            variant="default"
                            color="amber"
                            onClick={handleDeleteConfirm}
                            disabled={isDeleting}
                        >
                            {isDeleting ? "Đang xóa..." : "Xóa"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
