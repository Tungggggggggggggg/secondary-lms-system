"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAssignmentComments } from "@/hooks/use-assignment-comments";

interface QuestionCommentsProps {
  questionId: string;
  questionContent: string;
  questionOrder: number;
  initialCommentsCount?: number;
}

/**
 * Component hiển thị comments ở question level
 * Expand/collapse, lazy load khi expand
 */
export default function QuestionComments({
  questionId,
  questionContent,
  questionOrder,
  initialCommentsCount = 0,
}: QuestionCommentsProps) {
  const {
    comments,
    total,
    hasMore,
    isLoading,
    error,
    fetchQuestionComments,
    createQuestionComment,
    loadMore,
    startPolling,
    stopPolling,
  } = useAssignmentComments();

  const [isExpanded, setIsExpanded] = useState(false);
  const [commentContent, setCommentContent] = useState("");
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Load comments khi expand lần đầu
  useEffect(() => {
    if (isExpanded && !isLoaded) {
      fetchQuestionComments(questionId);
      setIsLoaded(true);
      // Bắt đầu polling khi expanded
      startPolling(undefined, questionId);
    }

    return () => {
      if (isExpanded) {
        stopPolling();
      }
    };
  }, [
    isExpanded,
    isLoaded,
    questionId,
    fetchQuestionComments,
    startPolling,
    stopPolling,
  ]);

  // Scroll to bottom khi có comment mới
  useEffect(() => {
    if (commentsEndRef.current && isExpanded) {
      commentsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [comments.length, isExpanded]);

  // Xử lý submit comment
  const handleSubmitComment = async () => {
    if (!commentContent.trim()) {
      return;
    }

    const result = await createQuestionComment(questionId, commentContent.trim());

    if (result) {
      setCommentContent("");
      setShowCommentForm(false);
    }
  };

  const displayCount = isExpanded ? total : initialCommentsCount;

  return (
    <div className="border-t border-gray-200 pt-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-violet-600 transition-colors"
        >
          <span>{isExpanded ? "▼" : "▶"}</span>
          <span>Bình luận ({displayCount})</span>
        </button>
        {isExpanded && (
          <Button
            type="button"
            onClick={() => setShowCommentForm(!showCommentForm)}
            variant="ghost"
            size="default"
            className="text-sm"
          >
            {showCommentForm ? "Hủy" : "Thêm bình luận"}
          </Button>
        )}
      </div>

      {/* Comment form */}
      {isExpanded && showCommentForm && (
        <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nội dung bình luận <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              placeholder="Nhập nội dung bình luận của bạn về câu hỏi này..."
              rows={3}
              required
            />
          </div>
          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowCommentForm(false);
                setCommentContent("");
              }}
            >
              Hủy
            </Button>
            <Button
              type="button"
              disabled={!commentContent.trim() || isLoading}
              onClick={handleSubmitComment}
            >
              {isLoading ? "Đang gửi..." : "Gửi bình luận"}
            </Button>
          </div>
        </div>
      )}

      {/* Comments list - chỉ hiển thị khi expanded */}
      {isExpanded && (
        <>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              <p className="font-semibold">Lỗi tải comments</p>
              <p className="text-xs mt-1">{error}</p>
            </div>
          )}

          {isLoading && comments.length === 0 ? (
            <div className="text-center py-6 text-gray-500 animate-pulse text-sm">
              Đang tải comments...
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm">
              <div className="text-3xl mb-2">💬</div>
              <p>Chưa có bình luận nào cho câu hỏi này</p>
            </div>
          ) : (
            <>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="p-3 bg-gray-50 rounded-xl border border-gray-200"
                  >
                    <div className="flex items-start gap-2 mb-1">
                      <div className="flex-shrink-0 w-6 h-6 bg-violet-600 text-white rounded-full flex items-center justify-center font-semibold text-xs">
                        {comment.user.fullname.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-800 text-sm">
                            {comment.user.fullname}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(comment.createdAt).toLocaleString("vi-VN", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-gray-700 text-sm whitespace-pre-wrap">{comment.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={commentsEndRef} />
              </div>

              {/* Load more button */}
              {hasMore && (
                <div className="mt-3 text-center">
                  <Button
                    type="button"
                    onClick={() => loadMore(undefined, questionId)}
                    variant="ghost"
                    size="default"
                    className="text-sm"
                    disabled={isLoading}
                  >
                    {isLoading ? "Đang tải..." : "Tải thêm bình luận"}
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}


