"use client";

import Link from "next/link";
import Avatar from "@/components/ui/avatar";
import AttachmentLink, { AttachmentItem } from "./AttachmentLink";

export interface PostItem {
    id: string;
    content: string;
    createdAt: string;
    pinnedAt?: string | null;
    author?: { id: string; fullname: string; email: string };
    attachments?: AttachmentItem[];
    _count?: { comments: number };
}

export interface CommentItem {
    id: string;
    content: string;
    createdAt: string;
    parentId?: string | null;
    status?: "APPROVED" | "REJECTED";
    author: {
        id: string;
        fullname: string;
        email: string;
    };
    replies?: CommentItem[]; // Cho nested comments
}

interface PostCardProps {
    post: PostItem;
    commentsTotal?: number; // Tổng số top-level comments
    detailUrl?: string; // URL để điều hướng đến trang chi tiết
    // Các props dưới đây là tùy chọn để tương thích với NewsFeedList
    recentComments?: CommentItem[];
    recentCommentsLoading?: boolean;
    comments?: CommentItem[];
    commentsLoading?: boolean;
    commentsPagination?: unknown;
    onFetchRecentComments?: (announcementId: string) => void;
    onFetchComments?: (announcementId: string, pageNum?: number) => void;
    onAddComment?: (announcementId: string, content: string, parentId?: string | null) => Promise<boolean>;
    showComments?: boolean;
    actions?: React.ReactNode;
}

/**
 * Component hiển thị một bài đăng (announcement) trong feed
 * Chỉ hiển thị nội dung bài viết, không có bình luận inline
 * Click vào bài viết hoặc link bình luận để xem trang chi tiết
 */
export default function PostCard({
    post,
    commentsTotal = 0,
    detailUrl,
    actions,
}: PostCardProps) {
    // Tính số lượng comments để hiển thị
    const commentCount = commentsTotal || post._count?.comments || 0;

    return (
        <div className="group bg-white rounded-3xl border border-slate-100 px-4 py-4 sm:px-6 sm:py-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)] hover:shadow-[0_22px_55px_rgba(79,70,229,0.16)] hover:border-indigo-100 transition-all duration-200">
            {/* Post Header */}
            <div className="flex items-center gap-3 mb-3 sm:mb-2">
                <Avatar
                    fullname={post.author?.fullname}
                    email={post.author?.email}
                    size="md"
                />
                <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-900 truncate">
                        {post.author?.fullname || "Giáo viên"}
                    </div>
                    <div className="text-xs text-slate-500">
                        {new Date(post.createdAt).toLocaleString("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                        })}
                    </div>
                </div>
                {actions}
            </div>

            {/* Post Content - Clickable để điều hướng nếu có detailUrl */}
            {detailUrl ? (
                <Link
                    href={detailUrl}
                    className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-white"
                >
                    <p className="whitespace-pre-line text-sm sm:text-[15px] text-slate-800 mb-3 group-hover:text-indigo-700 transition-colors">
                        {post.content}
                    </p>
                </Link>
            ) : (
                <p className="whitespace-pre-line text-sm sm:text-[15px] text-slate-800 mb-3">
                    {post.content}
                </p>
            )}

            {/* Attachments */}
            {post.attachments && post.attachments.length > 0 && (
                <div className="mt-2 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 px-3.5 py-3.5 text-xs sm:text-sm text-slate-800 mb-3">
                    <div className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase mb-1.5">
                        Đính kèm
                    </div>
                    <ul className="space-y-1.5">
                        {post.attachments.map((f) => (
                            <li key={f.id}>
                                <AttachmentLink file={f} />
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Comments Link - Chỉ hiển thị nếu có detailUrl */}
            {detailUrl && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <Link
                        href={detailUrl}
                        className="text-xs sm:text-sm font-semibold bg-gradient-to-r from-indigo-500 to-sky-500 bg-clip-text text-transparent hover:from-indigo-600 hover:to-sky-600 transition-colors"
                    >
                        {commentCount > 0
                            ? `${commentCount} bình luận • Xem chi tiết`
                            : "Xem chi tiết"}
                    </Link>
                </div>
            )}
        </div>
    );
}
