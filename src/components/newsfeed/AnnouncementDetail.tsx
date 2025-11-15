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
    const teacherHook = role === "teacher" ? useTeacherAnnouncements() : null;
    const studentHook = role === "student" ? useStudentAnnouncements() : null;

    // Lấy data từ hook
    const announcements = role === "teacher"
        ? teacherHook?.announcements || []
        : studentHook?.announcements || [];
    const comments = role === "teacher"
        ? teacherHook?.comments || {}
        : studentHook?.comments || {};
    const commentsTotal = role === "teacher"
        ? teacherHook?.commentsTotal || {}
        : studentHook?.commentsTotal || {};
    const commentsLoading = role === "teacher"
        ? teacherHook?.commentsLoading || {}
        : studentHook?.commentsLoading || {};
    const commentsPagination = role === "teacher"
        ? teacherHook?.commentsPagination || {}
        : studentHook?.commentsPagination || {};
    const fetchAnnouncements = role === "teacher"
        ? teacherHook?.fetchAnnouncements
        : studentHook?.fetchAnnouncements;
    const fetchComments = role === "teacher"
        ? teacherHook?.fetchComments
        : studentHook?.fetchComments;
    const addComment = role === "teacher"
        ? teacherHook?.addComment
        : studentHook?.addComment;

    // Tìm announcement trong danh sách
    const announcement = announcements.find((a) => a.id === announcementId);

    // State cho comment form
    const [commentDraft, setCommentDraft] = useState("");
    const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [commentsPage, setCommentsPage] = useState(1);
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
        if (!addComment || !content) return;

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

    // Render comment với replies
    const renderComment = (comment: CommentItem, isReply: boolean = false) => {
        const replies = comment.replies || [];
        const shouldShowAllReplies = expandedReplies[comment.id] || false;
        const displayReplies = shouldShowAllReplies ? replies : replies.slice(0, 3);
        const hasMoreReplies = replies.length > 3;

        return (
            <div
                key={comment.id}
                className={`flex items-start gap-4 ${
                    isReply
                        ? "ml-10 pl-5 border-l-4 border-indigo-200 dark:border-indigo-800 rounded-l-lg"
                        : "bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm"
                }`}
            >
                <Avatar
                    fullname={comment.author.fullname}
                    email={comment.author.email}
                    size="md"
                    className="flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-base font-semibold text-gray-900 dark:text-gray-100">
                            {comment.author.fullname}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(comment.createdAt).toLocaleString("vi-VN", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        </span>
                    </div>
                    <div className="text-base text-gray-800 dark:text-gray-200 whitespace-pre-line mb-3 leading-relaxed">
                        {comment.content}
                    </div>
                    {addComment && (
                        <div className="mb-3">
                            {replyingTo === comment.id ? (
                                <div className="mt-3 space-y-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                                    <Textarea
                                        value={replyDraft[comment.id] || ""}
                                        onChange={(e) =>
                                            setReplyDraft((prev) => ({
                                                ...prev,
                                                [comment.id]: e.target.value,
                                            }))
                                        }
                                        placeholder="Viết câu trả lời..."
                                        className="min-h-[70px] text-base"
                                        disabled={isSubmitting}
                                    />
                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="default"
                                            onClick={() => handleAddComment(comment.id)}
                                            disabled={
                                                !replyDraft[comment.id]?.trim() ||
                                                isSubmitting
                                            }
                                            className="px-4"
                                        >
                                            {isSubmitting ? "Đang gửi..." : "Gửi"}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="default"
                                            onClick={() => {
                                                setReplyingTo(null);
                                                setReplyDraft((prev) => {
                                                    const next = { ...prev };
                                                    delete next[comment.id];
                                                    return next;
                                                });
                                            }}
                                        >
                                            Hủy
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setReplyingTo(comment.id)}
                                    className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors font-medium px-2 py-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                                >
                                    Trả lời
                                </button>
                            )}
                        </div>
                    )}
                    {displayReplies.length > 0 && (
                        <div className="mt-4 space-y-4">
                            {displayReplies.map((reply) => renderComment(reply, true))}
                            {hasMoreReplies && !shouldShowAllReplies && (
                                <Button
                                    variant="ghost"
                                    size="default"
                                    onClick={() =>
                                        setExpandedReplies((prev) => ({
                                            ...prev,
                                            [comment.id]: true,
                                        }))
                                    }
                                    className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium"
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
        <div className="space-y-6">
            {/* Post Content */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-6 bg-white dark:bg-gray-950">
                <div className="flex items-center gap-3 mb-4">
                    <Avatar
                        fullname={announcement.author?.fullname}
                        email={announcement.author?.email}
                        size="md"
                    />
                    <div>
                        <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                            {announcement.author?.fullname || "Giáo viên"}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(announcement.createdAt).toLocaleString("vi-VN", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        </div>
                    </div>
                </div>
                <div className="whitespace-pre-line text-gray-800 dark:text-gray-200 mb-4">
                    {announcement.content}
                </div>
                {announcement.attachments && announcement.attachments.length > 0 && (
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-sm text-gray-700 dark:text-gray-300">
                        <div className="font-medium mb-2">Đính kèm</div>
                        <ul className="space-y-1">
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
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-6 bg-white dark:bg-gray-950">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
                    Bình luận ({commentsPagination[announcementId]?.total ?? commentsTotal[announcementId] ?? postComments.length ?? 0})
                </h3>

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
                                    <Skeleton className="h-20 w-full rounded-lg" />
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
                                    className="w-full py-2"
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
                    <div className="text-base text-gray-500 dark:text-gray-400 text-center py-12">
                        Chưa có bình luận nào
                    </div>
                )}

                {/* Add Comment Form */}
                {addComment && (
                    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
                        <div className="flex items-start gap-4">
                            <Avatar
                                fullname={announcement.author?.fullname}
                                email={announcement.author?.email}
                                size="md"
                                className="flex-shrink-0"
                            />
                            <div className="flex-1 flex items-start gap-3">
                                <Textarea
                                    value={commentDraft}
                                    onChange={(e) => setCommentDraft(e.target.value)}
                                    placeholder="Viết bình luận..."
                                    className="min-h-[80px] flex-1 text-base"
                                    disabled={isSubmitting}
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
                                <Button
                                    onClick={() => handleAddComment()}
                                    disabled={!commentDraft.trim() || isSubmitting}
                                    className="self-end px-6 py-2"
                                >
                                    {isSubmitting ? "Đang gửi..." : "Gửi"}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

