"use client";

import Link from "next/link";
import Avatar from "@/components/ui/avatar";
import AttachmentLink, { AttachmentItem } from "./AttachmentLink";

export interface PostItem {
    id: string;
    content: string;
    createdAt: string;
    author?: { id: string; fullname: string; email: string };
    attachments?: AttachmentItem[];
    _count?: { comments: number };
}

export interface CommentItem {
    id: string;
    content: string;
    createdAt: string;
    parentId?: string | null;
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
}: PostCardProps) {
    // Tính số lượng comments để hiển thị
    const commentCount = commentsTotal || post._count?.comments || 0;

    return (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-950 hover:shadow-md transition-shadow">
            {/* Post Header */}
            <div className="flex items-center gap-3 mb-3">
                <Avatar
                    fullname={post.author?.fullname}
                    email={post.author?.email}
                    size="md"
                />
                <div>
                    <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                        {post.author?.fullname || "Giáo viên"}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(post.createdAt).toLocaleString("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                        })}
                    </div>
                </div>
            </div>

            {/* Post Content - Clickable để điều hướng nếu có detailUrl */}
            {detailUrl ? (
                <Link href={detailUrl} className="block">
                    <div className="whitespace-pre-line text-gray-800 dark:text-gray-200 mb-3 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer">
                        {post.content}
                    </div>
                </Link>
            ) : (
                <div className="whitespace-pre-line text-gray-800 dark:text-gray-200 mb-3">
                    {post.content}
                </div>
            )}

            {/* Attachments */}
            {post.attachments && post.attachments.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-sm text-gray-700 dark:text-gray-300 mb-3">
                    <div className="font-medium mb-2">Đính kèm</div>
                    <ul className="space-y-1">
                        {post.attachments.map((f) => (
                            <li key={f.id}>
                                <AttachmentLink file={f} />
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Comments Link - Chỉ hiển thị nếu có comments hoặc detailUrl */}
            {detailUrl && (
                <div className="mt-4 border-t border-gray-200 dark:border-gray-800 pt-3">
                    <Link
                        href={detailUrl}
                        className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors font-medium"
                    >
                        {commentCount > 0
                            ? `${commentCount} bình luận`
                            : "Xem chi tiết"}
                    </Link>
                </div>
            )}
        </div>
    );
}
