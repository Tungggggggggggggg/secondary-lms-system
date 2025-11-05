"use client";

import { useEffect, useState } from "react";
import AttachmentLink, { AttachmentItem } from "./AttachmentLink";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  // Props cho comments
  recentComments?: CommentItem[]; // 1-2 comments ngẫu nhiên
  recentCommentsLoading?: boolean;
  commentsTotal?: number; // Tổng số top-level comments
  comments?: CommentItem[]; // Tất cả comments (cho modal)
  commentsLoading?: boolean;
  commentsPagination?: { page: number; pageSize: number; total: number; totalPages: number };
  onFetchRecentComments?: (announcementId: string) => void;
  onFetchComments?: (announcementId: string, page?: number) => void;
  onAddComment?: (announcementId: string, content: string, parentId?: string | null) => Promise<boolean>;
  showComments?: boolean; // Cho phép ẩn/hiện comments section
}

export default function PostCard({
  post,
  recentComments = [],
  recentCommentsLoading = false,
  commentsTotal = 0,
  comments = [],
  commentsLoading = false,
  commentsPagination,
  onFetchRecentComments,
  onFetchComments,
  onAddComment,
  showComments = true,
}: PostCardProps) {
  const [commentDraft, setCommentDraft] = useState("");
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({}); // Draft cho reply comments
  const [replyingTo, setReplyingTo] = useState<string | null>(null); // ID của comment đang reply
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false); // Modal để hiển thị tất cả comments
  const [commentsPage, setCommentsPage] = useState(1);
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({}); // Track replies đã expand

  // Tự động load 1-2 comments ngẫu nhiên khi component mount (hook phía dưới idempotent)
  useEffect(() => {
    if (showComments && onFetchRecentComments) {
      onFetchRecentComments(post.id);
    }
  }, [showComments, onFetchRecentComments, post.id]);

  // Mở modal và load tất cả comments nếu chưa có
  const handleOpenModal = () => {
    setShowModal(true);
    if (comments.length === 0 && onFetchComments) {
      onFetchComments(post.id, 1);
      setCommentsPage(1);
    }
  };

  const handleAddComment = async (parentId?: string | null) => {
    const content = parentId ? (replyDraft[parentId] || "").trim() : commentDraft.trim();
    if (!onAddComment || !content) return;
    
    setIsSubmitting(true);
    const success = await onAddComment(post.id, content, parentId);
    if (success) {
      if (parentId) {
        setReplyDraft((prev) => ({ ...prev, [parentId]: "" }));
        setReplyingTo(null);
      } else {
        setCommentDraft("");
      }
      // Reload recent comments để hiển thị comment mới
      if (onFetchRecentComments) {
        onFetchRecentComments(post.id);
      }
      // Reload all comments nếu modal đang mở
      if (showModal && onFetchComments) {
        onFetchComments(post.id, 1);
        setCommentsPage(1);
      }
    }
    setIsSubmitting(false);
  };

  const handleLoadMoreComments = () => {
    if (onFetchComments && commentsPagination && commentsPage < commentsPagination.totalPages) {
      const nextPage = commentsPage + 1;
      onFetchComments(post.id, nextPage);
      setCommentsPage(nextPage);
    }
  };

  const hasMoreComments = commentsPagination ? commentsPage < commentsPagination.totalPages : false;

  // Render một comment (có thể là top-level hoặc reply)
  // showAllReplies: true nếu đang ở trong modal hoặc đã expand replies
  const renderComment = (comment: CommentItem, isReply: boolean = false, showAllReplies: boolean = false) => {
    const replies = comment.replies || [];
    const shouldShowAllReplies = showAllReplies || expandedReplies[comment.id] || false;
    const displayReplies = shouldShowAllReplies ? replies : replies.slice(0, 3); // Chỉ hiển thị 3 cũ nhất
    const hasMoreReplies = replies.length > 3;
    
    return (
    <div
      key={comment.id}
      className={`bg-gray-50 dark:bg-gray-900 rounded-lg p-3 ${isReply ? "ml-6 mt-2" : ""}`}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
              {comment.author.fullname}
            </div>
            {isReply && (
              <span className="text-xs text-gray-500 dark:text-gray-400">→</span>
            )}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {new Date(comment.createdAt).toLocaleString()}
          </div>
          <div className="text-sm text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-line">
            {comment.content}
          </div>
          {/* Nút Trả lời */}
          {onAddComment && (
            <div className="mt-2">
              {replyingTo === comment.id ? (
                <div className="mt-2 space-y-2">
                  <Textarea
                    value={replyDraft[comment.id] || ""}
                    onChange={(e) =>
                      setReplyDraft((prev) => ({ ...prev, [comment.id]: e.target.value }))
                    }
                    placeholder="Viết câu trả lời..."
                    className="min-h-[50px] text-sm"
                    disabled={isSubmitting}
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAddComment(comment.id)}
                      disabled={!replyDraft[comment.id]?.trim() || isSubmitting}
                    >
                      {isSubmitting ? "Đang gửi..." : "Gửi"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setReplyingTo(null);
                        setReplyDraft((prev) => ({ ...prev, [comment.id]: "" }));
                      }}
                    >
                      Hủy
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setReplyingTo(comment.id)}
                  className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  Trả lời
                </button>
              )}
            </div>
          )}
          {/* Hiển thị replies nếu có */}
          {displayReplies.length > 0 && (
            <div className="mt-2 space-y-2">
              {displayReplies.map((reply) => renderComment(reply, true, showAllReplies))}
              {/* Nút "Xem thêm" replies nếu có > 3 và chưa expand */}
              {hasMoreReplies && !shouldShowAllReplies && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedReplies((prev) => ({ ...prev, [comment.id]: true }))}
                  className="text-xs text-gray-600 dark:text-gray-400"
                >
                  Xem thêm {replies.length - 3} câu trả lời
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
    );
  };

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
      {/* Header */}
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
        <span className="font-medium">{post.author?.fullname || "Giáo viên"}</span>
        <span className="ml-2">•</span>
        <span className="ml-2">{new Date(post.createdAt).toLocaleString()}</span>
      </div>

      {/* Content */}
      <div className="whitespace-pre-line text-gray-800 dark:text-gray-200 mb-3">{post.content}</div>

      {/* Attachments */}
      {post.attachments && post.attachments.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-sm text-gray-700 dark:text-gray-300 mb-3">
          <div className="font-medium mb-1">Đính kèm</div>
          <ul className="space-y-1">
            {post.attachments.map((f) => (
              <li key={f.id}>
                <AttachmentLink file={f} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Comments Section */}
      {showComments && (
        <div className="mt-4 border-t border-gray-200 dark:border-gray-800 pt-4">
          {/* Comments List */}
          <div className="space-y-3 mb-4">
            {recentCommentsLoading && recentComments.length === 0 ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (recentComments.length > 0 || comments.length > 0) ? (
              <div className="space-y-3">
                {(recentComments.length > 0 ? recentComments : comments.slice(0, 3)).map((comment) =>
                  renderComment(comment, false, false)
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                Chưa có bình luận nào
              </div>
            )}
          </div>

          {/* Nút Xem thêm bình luận - chỉ hiển thị nếu có > 3 comments */}
          {(commentsPagination?.total ?? commentsTotal ?? comments.length) > 3 && (
            <div className="mb-4">
              <Button
                variant="ghost"
                onClick={handleOpenModal}
                className="w-full text-sm"
                disabled={commentsLoading}
              >
                {commentsLoading
                  ? "Đang tải..."
                  : `Xem thêm bình luận (${commentsPagination?.total ?? commentsTotal ?? comments.length} bình luận)`}
              </Button>
            </div>
          )}

          {/* Add Comment Form - Luôn hiển thị */}
          {onAddComment && (
            <div className="mt-4 flex items-start gap-2">
              <Textarea
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                placeholder="Viết bình luận..."
                className="min-h-[60px] flex-1"
                disabled={isSubmitting}
              />
              <Button onClick={() => handleAddComment()} disabled={!commentDraft.trim() || isSubmitting}>
                {isSubmitting ? "Đang gửi..." : "Gửi"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Modal hiển thị tất cả comments */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-3xl md:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Tất cả bình luận ({commentsTotal})</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-1">
            {commentsLoading && comments.length === 0 ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : comments.length > 0 ? (
              <div className="space-y-3 pb-4">
                {comments.map((comment) => renderComment(comment, false, true))}
                {hasMoreComments && (
                  <Button
                    variant="outline"
                    onClick={handleLoadMoreComments}
                    disabled={commentsLoading}
                    className="w-full"
                  >
                    {commentsLoading ? "Đang tải..." : "Tải thêm bình luận"}
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                Chưa có bình luận nào
              </div>
            )}
          </div>
          {/* Add Comment Form trong modal */}
          {onAddComment && (
            <div className="mt-4 flex items-start gap-2 border-t border-gray-200 dark:border-gray-800 pt-4">
              <Textarea
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                placeholder="Viết bình luận..."
                className="min-h-[60px] flex-1"
                disabled={isSubmitting}
              />
              <Button onClick={() => handleAddComment()} disabled={!commentDraft.trim() || isSubmitting}>
                {isSubmitting ? "Đang gửi..." : "Gửi"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
