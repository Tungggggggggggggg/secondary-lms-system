"use client";

import { useEffect, useRef, useState } from "react";
import { useTeacherAnnouncements } from "@/hooks/use-teacher-announcements";
import { useStudentAnnouncements } from "@/hooks/use-student-announcements";
import Avatar from "@/components/ui/avatar";
import AttachmentLink, { AttachmentItem } from "./AttachmentLink";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CommentItem } from "./PostCard";
import { Bell, MessageCircle, Send } from "lucide-react";

interface AnnouncementDetailProps {
    announcementId: string;
    classroomId: string;
    role: "teacher" | "student";
}

/**
 * Component hiển thị chi tiết một announcement với tất cả bình luận
 */
export default function AnnouncementDetail({
    announcementId,
    classroomId,
    role,
}: AnnouncementDetailProps) {
    // Gọi hooks cố định để tuân thủ rules-of-hooks, sau đó chọn hook theo role
    const teacherHook = useTeacherAnnouncements();
    const studentHook = useStudentAnnouncements();

    const isTeacher = role === "teacher";
    const activeHook = isTeacher ? teacherHook : studentHook;

    // Teacher-only actions
    const hideComment = isTeacher ? teacherHook.hideComment : undefined;
    const unhideComment = isTeacher ? teacherHook.unhideComment : undefined;
    const deleteComment = isTeacher ? teacherHook.deleteComment : undefined;

    // Lấy data từ hook đang active theo role
    const announcements = activeHook.announcements || [];
    const comments = activeHook.comments || {};
    const commentsTotal = activeHook.commentsTotal || {};
    const commentsLoading = activeHook.commentsLoading || {};
    const commentsPagination = activeHook.commentsPagination || {};
    const fetchAnnouncements = activeHook.fetchAnnouncements;
    const fetchComments = activeHook.fetchComments;
    const addComment = activeHook.addComment;

    // Tìm announcement trong danh sách
    const announcement = announcements.find((a) => a.id === announcementId);

    // State cho comment form
    const [commentDraft, setCommentDraft] = useState("");
    const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [commentsPage, setCommentsPage] = useState(1);
    const [locked, setLocked] = useState<boolean>(false);
    const [loadingLock, setLoadingLock] = useState<boolean>(false);
    const [togglingLock, setTogglingLock] = useState<boolean>(false);
    const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});

    const commentsEndRef = useRef<HTMLDivElement>(null);

    // Fetch announcement nếu chưa có
    useEffect(() => {
        if (!announcement && fetchAnnouncements && classroomId) {
            fetchAnnouncements(classroomId, 1, 10);
        }
    }, [announcement, fetchAnnouncements, classroomId]);

    // Fetch comments khi component mount
    useEffect(() => {
        if (fetchComments && announcementId) {
            fetchComments(announcementId, 1, 10);
            setCommentsPage(1);
        }
    }, [announcementId, fetchComments]);

    // Load lock state (teacher only)
    useEffect(() => {
        let mounted = true;
        const loadLock = async () => {
            if (!isTeacher || !announcementId) return;
            try {
                setLoadingLock(true);
                const res = await fetch(`/api/announcements/${announcementId}/lock`);
                const data = await res.json();
                if (mounted && res.ok && data?.success) {
                    setLocked(Boolean(data.locked));
                }
            } catch {}
            finally {
                setLoadingLock(false);
            }
        };
        loadLock();
        return () => { mounted = false; };
    }, [isTeacher, announcementId]);

    const handleToggleLock = async () => {
        if (!isTeacher) return;
        try {
            setTogglingLock(true);
            const res = await fetch(`/api/announcements/${announcementId}/lock`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ locked: !locked }),
            });
            const data = await res.json();
            if (res.ok && data?.success) setLocked(Boolean(data.locked));
        } catch (e) {}
        finally { setTogglingLock(false); }
    };

    // Auto-scroll to bottom khi có comment mới
    useEffect(() => {
        if (commentsEndRef.current) {
            commentsEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
        }
    }, [comments[announcementId]?.length]);

    // Handler để thêm comment hoặc reply
    const handleAddComment = async (parentId?: string | null) => {
        const content = parentId
            ? (replyDraft[parentId] || "").trim()
            : commentDraft.trim();
        if (!content) return;

        try {
            setIsSubmitting(true);
            const success = await addComment(announcementId, content, parentId);

            if (success) {
                if (parentId) {
                    setReplyDraft((prev) => {
                        const next = { ...prev };
                        delete next[parentId];
                        return next;
                    });
                    setReplyingTo(null);
                } else {
                    setCommentDraft("");
                }

                // Reload comments
                if (fetchComments) {
                    fetchComments(announcementId, 1, 10, { force: true });
                    setCommentsPage(1);
                }
            }
        } catch (error) {
            console.error(`[ERROR] AnnouncementDetail - Add comment:`, error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handler để load thêm comments
    const handleLoadMoreComments = () => {
        if (
            fetchComments &&
            commentsPagination[announcementId] &&
            commentsPage < commentsPagination[announcementId].totalPages
        ) {
            const nextPage = commentsPage + 1;
            fetchComments(announcementId, nextPage, 10);
            setCommentsPage(nextPage);
        }
    };

    const postComments: CommentItem[] = comments[announcementId] || [];
    const hasMoreComments = commentsPagination[announcementId]
        ? commentsPage < commentsPagination[announcementId].totalPages
        : false;

    const totalComments =
        commentsPagination[announcementId]?.total ??
        commentsTotal[announcementId] ??
        postComments.length ??
        0;

    // Render comment với replies
    const renderComment = (comment: CommentItem, isReply: boolean = false) => {
        const replies = comment.replies || [];
        const shouldShowAllReplies = expandedReplies[comment.id] || false;
        const displayReplies = shouldShowAllReplies ? replies : replies.slice(0, 3);
        const hasMoreReplies = replies.length > 3;

        return (
            <div
                key={comment.id}
                className={`group flex items-start gap-3 ${isReply ? "ml-10" : ""}`}
            >
                <Avatar
                    fullname={comment.author.fullname}
                    email={comment.author.email}
                    size="md"
                    className="flex-shrink-0"
                />
                <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-slate-900">
                            {comment.author.fullname}
                        </span>
                        <span className="text-[11px] text-slate-500">
                            {new Date(comment.createdAt).toLocaleString("vi-VN", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        </span>
                        {isTeacher && comment.status === "REJECTED" && (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">Đã ẩn</span>
                        )}
                        {isTeacher && (
                            <div className="ml-auto flex items-center gap-1.5">
                                {comment.status !== "REJECTED" ? (
                                    <Button
                                        variant="ghost"
                                        onClick={async () => {
                                            if (hideComment) {
                                                await hideComment(announcementId, comment.id);
                                                if (fetchComments)
                                                    fetchComments(announcementId, 1, 10, { force: true });
                                            }
                                        }}
                                        className="h-7 px-2 text-[11px] font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                                    >
                                        Ẩn
                                    </Button>
                                ) : (
                                    <Button
                                        variant="ghost"
                                        onClick={async () => {
                                            if (unhideComment) {
                                                await unhideComment(announcementId, comment.id);
                                                if (fetchComments)
                                                    fetchComments(announcementId, 1, 10, { force: true });
                                            }
                                        }}
                                        className="h-7 px-2 text-[11px] font-medium text-slate-500 hover:text-emerald-600 hover:bg-emerald-50"
                                    >
                                        Hiện
                                    </Button>
                                )}
                                <Button
                                    variant="ghost"
                                    onClick={async () => {
                                        if (deleteComment) {
                                            await deleteComment(announcementId, comment.id);
                                            if (fetchComments)
                                                fetchComments(announcementId, 1, 10, { force: true });
                                        }
                                    }}
                                    className="h-7 px-2 text-[11px] font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                                >
                                    Xóa
                                </Button>
                            </div>
                        )}
                    </div>
                    <div
                        className={`mt-1 inline-block max-w-full rounded-2xl px-4 py-3 text-sm leading-relaxed text-slate-800 whitespace-pre-line transition-colors ${
                            isReply
                                ? "bg-indigo-50 group-hover:bg-indigo-100"
                                : "bg-slate-50 group-hover:bg-slate-100"
                        }`}
                    >
                        {comment.content}
                    </div>
                    <div className="mb-1">
                        {replyingTo === comment.id ? (
                            <div className="mt-3 space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                                <Textarea
                                    value={replyDraft[comment.id] || ""}
                                    onChange={(e) =>
                                        setReplyDraft((prev) => ({
                                            ...prev,
                                            [comment.id]: e.target.value,
                                        }))
                                    }
                                    placeholder="Viết câu trả lời..."
                                    className="min-h-[70px] text-sm sm:text-[15px]"
                                    disabled={isSubmitting || locked}
                                />
                                <div className="flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        onClick={() => handleAddComment(comment.id)}
                                        disabled={!replyDraft[comment.id]?.trim() || isSubmitting || locked}
                                        className="px-4 bg-gradient-to-r from-indigo-500 to-sky-500 text-white hover:from-indigo-600 hover:to-sky-600"
                                    >
                                        {isSubmitting ? "Đang gửi..." : "Gửi"}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setReplyingTo(null);
                                            setReplyDraft((prev) => {
                                                const next = { ...prev };
                                                delete next[comment.id];
                                                return next;
                                            });
                                        }}
                                        className="text-sm text-slate-500 hover:text-slate-700"
                                    >
                                        Hủy
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setReplyingTo(comment.id)}
                                disabled={locked}
                                className="inline-flex items-center gap-1 text-xs sm:text-sm text-indigo-600 hover:text-indigo-700 font-medium px-2 py-1 rounded-full hover:bg-indigo-50 disabled:opacity-50"
                            >
                                <MessageCircle className="h-3.5 w-3.5" />
                                <span>Trả lời</span>
                            </button>
                        )}
                    </div>
                    {displayReplies.length > 0 && (
                        <div className="mt-3 space-y-4">
                            {displayReplies.map((reply) => renderComment(reply, true))}
                            {hasMoreReplies && !shouldShowAllReplies && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                        setExpandedReplies((prev) => ({
                                            ...prev,
                                            [comment.id]: true,
                                        }))
                                    }
                                    className="text-xs sm:text-sm text-indigo-600 hover:text-indigo-700 font-medium px-0"
                                >
                                    Xem thêm {replies.length - 3} câu trả lời
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    if (!announcement) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6 lg:grid lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)] lg:items-start lg:gap-6">
            {/* Left column: content + comments */}
            <div className="space-y-6">
                {/* Post Content */}
                <div className="bg-white rounded-3xl border border-slate-100 px-4 py-4 sm:px-6 sm:py-6 shadow-sm">
                    <div className="flex items-start gap-3 sm:gap-4 mb-4">
                        <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-sky-500 to-emerald-300 text-white shadow-sm">
                            <Bell className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 space-y-1">
                            <p className="text-[11px] font-semibold tracking-wide text-emerald-600 uppercase">
                                Thông báo của lớp
                            </p>
                            <h1 className="text-base sm:text-lg md:text-xl font-bold text-slate-900 line-clamp-2">
                                {announcement.content.split("\n")[0] || "Thông báo lớp học"}
                            </h1>
                            <p className="text-xs sm:text-sm text-slate-600">
                                <span className="font-medium text-slate-800">
                                    {announcement.author?.fullname || "Giáo viên"}
                                </span>
                                <span className="mx-1">•</span>
                                <span>
                                    {new Date(announcement.createdAt).toLocaleString("vi-VN", {
                                        day: "2-digit",
                                        month: "2-digit",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </span>
                            </p>
                        </div>
                    </div>
                    <div className="whitespace-pre-line text-sm sm:text-base leading-relaxed text-slate-800 mb-4">
                        {announcement.content}
                    </div>
                    {announcement.attachments && announcement.attachments.length > 0 && (
                        <div className="mt-2 rounded-2xl border border-indigo-50 bg-gradient-to-r from-indigo-50 via-sky-50 to-indigo-50 px-3.5 py-3.5 text-xs sm:text-sm text-slate-800">
                            <div className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase mb-1.5">
                                Đính kèm
                            </div>
                            <ul className="space-y-1.5">
                                {announcement.attachments.map((att) => (
                                    <li key={att.id}>
                                        <AttachmentLink
                                            file={{
                                                id: att.id,
                                                name: att.name,
                                                size: att.size,
                                                mimeType: att.mimeType,
                                            }}
                                        />
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Comments Section */}
                <div className="bg-white rounded-3xl border border-slate-100 px-4 py-4 sm:px-6 sm:py-6 shadow-sm">
                    <div className="flex items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                                <MessageCircle className="h-4 w-4" />
                            </div>
                            <div>
                                <h3 className="text-base sm:text-lg font-semibold text-slate-900">
                                    Bình luận ({totalComments})
                                </h3>
                                <p className="text-xs sm:text-sm text-slate-500">
                                    Trao đổi cùng giáo viên và bạn học.
                                </p>
                            </div>
                        </div>
                    </div>

                    {isTeacher && (
                        <div className="mb-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <div className="text-xs sm:text-sm text-slate-700">
                                Trạng thái: {locked ? <span className="font-semibold text-rose-600">Đang khóa bình luận</span> : <span className="font-semibold text-emerald-600">Đang mở bình luận</span>}
                            </div>
                            <Button
                                variant={locked ? "outline" : "default"}
                                onClick={handleToggleLock}
                                disabled={loadingLock || togglingLock}
                                className="h-8 px-3 text-xs sm:text-sm"
                            >
                                {locked ? (togglingLock ? "Đang mở khóa..." : "Mở khóa bình luận") : (togglingLock ? "Đang khóa..." : "Khóa bình luận")}
                            </Button>
                        </div>
                    )}

                    {commentsLoading[announcementId] && postComments.length === 0 ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-start gap-4">
                                    <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                                    <div className="flex-1 space-y-3">
                                        <div className="flex items-center gap-3">
                                            <Skeleton className="h-4 w-24" />
                                            <Skeleton className="h-3 w-32" />
                                        </div>
                                        <Skeleton className="h-20 w-full rounded-2xl" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : postComments.length > 0 ? (
                        <div className="space-y-6 mb-6">
                            {postComments.map((comment) => renderComment(comment, false))}
                            {hasMoreComments && (
                                <div className="pt-2">
                                    <Button
                                        variant="outline"
                                        onClick={handleLoadMoreComments}
                                        disabled={commentsLoading[announcementId]}
                                        className="w-full py-2 text-sm"
                                    >
                                        {commentsLoading[announcementId]
                                            ? "Đang tải..."
                                            : "Tải thêm bình luận"}
                                    </Button>
                                </div>
                            )}
                            <div ref={commentsEndRef} />
                        </div>
                    ) : (
                        <div className="text-base text-slate-500 text-center py-8">
                            Chưa có bình luận nào
                        </div>
                    )}

                    {/* Add Comment Form */}
                    <div className="mt-6 pt-6 border-t border-slate-100">
                        <div className="flex items-start gap-3 sm:gap-4">
                            <Avatar
                                fullname={announcement.author?.fullname}
                                email={announcement.author?.email}
                                size="md"
                                className="flex-shrink-0"
                            />
                            <div className="flex-1 space-y-3">
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 transition-all focus-within:border-indigo-500 focus-within:bg-white focus-within:shadow-[0_0_0_1px_rgba(79,70,229,0.15)]">
                                    <Textarea
                                        value={commentDraft}
                                        onChange={(e) => setCommentDraft(e.target.value)}
                                        placeholder="Viết bình luận..."
                                        className="min-h-[72px] w-full resize-none border-none bg-transparent p-0 text-sm sm:text-[15px] shadow-none focus-visible:ring-0"
                                        disabled={isSubmitting || locked}
                                        onKeyDown={(e) => {
                                            if (
                                                e.key === "Enter" &&
                                                (e.metaKey || e.ctrlKey)
                                            ) {
                                                e.preventDefault();
                                                handleAddComment();
                                            }
                                        }}
                                    />
                                </div>
                                <div className="flex justify-end">
                                    <Button
                                        onClick={() => handleAddComment()}
                                        disabled={!commentDraft.trim() || isSubmitting || locked}
                                        className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-sky-500 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:shadow-md hover:from-indigo-600 hover:to-sky-600 disabled:opacity-60"
                                    >
                                        {isSubmitting ? "Đang gửi..." : "Gửi"}
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right column: sidebar meta */}
            <aside className="mt-2 lg:mt-0 space-y-4 lg:space-y-5 lg:sticky lg:top-24">
                <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 shadow-sm">
                    <h4 className="text-xs font-semibold tracking-wide text-slate-500 uppercase mb-3">
                        Thông tin bài đăng
                    </h4>
                    <div className="space-y-2 text-xs sm:text-sm text-slate-700">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-slate-500">Người tạo</span>
                            <span className="font-medium text-slate-900 truncate max-w-[60%] text-right">
                                {announcement.author?.fullname || "Giáo viên"}
                            </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-slate-500">Thời gian</span>
                            <span className="text-right text-slate-800 text-[11px] sm:text-xs">
                                {new Date(announcement.createdAt).toLocaleString("vi-VN", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                            </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-slate-500">Số bình luận</span>
                            <span className="font-medium text-slate-900">{totalComments}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                           
                        </div>
                    </div>
                </div>

                {isTeacher && (
                    <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 shadow-sm space-y-3">
                        <h4 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                            Tác vụ nhanh
                        </h4>
                        <p className="text-xs text-slate-500 mb-1">
                            Các thao tác dành cho giáo viên (chưa kết nối hành động thực tế).
                        </p>
                        <div className="flex flex-col gap-2 text-xs sm:text-sm">
                            <button
                                type="button"
                                className="inline-flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-slate-700 hover:border-indigo-300 hover:bg-slate-50"
                            >
                                <span>Chia sẻ bài đăng</span>
                                <span className="text-[11px] text-slate-400">Sắp ra mắt</span>
                            </button>
                            <button
                                type="button"
                                className="inline-flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-slate-700 hover:border-indigo-300 hover:bg-slate-50"
                            >
                                <span>Gắn thẻ / tag</span>
                                <span className="text-[11px] text-slate-400">Sắp ra mắt</span>
                            </button>
                            <button
                                type="button"
                                className="inline-flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-slate-700 hover:border-indigo-300 hover:bg-slate-50"
                            >
                                <span>Chỉnh sửa thông báo</span>
                                <span className="text-[11px] text-slate-400">Sắp ra mắt</span>
                            </button>
                        </div>
                    </div>
                )}
            </aside>
        </div>
    );
}

