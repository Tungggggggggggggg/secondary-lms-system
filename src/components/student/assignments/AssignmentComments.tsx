"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAssignmentComments, Comment } from "@/hooks/use-assignment-comments";
import { MessageSquare } from "lucide-react";
import { StudentAssignmentDetail } from "@/hooks/use-student-assignments";

interface AssignmentCommentsProps {
  assignment: StudentAssignmentDetail;
}

/**
 * Component hiển thị comments ở assignment level
 * Lazy load và pagination, real-time updates với polling
 */
export default function AssignmentComments({
  assignment,
}: AssignmentCommentsProps) {
  const {
    comments,
    total,
    hasMore,
    isLoading,
    error,
    fetchAssignmentComments,
    createAssignmentComment,
    loadMore,
    startPolling,
    stopPolling,
  } = useAssignmentComments();

  const [commentContent, setCommentContent] = useState("");
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(
    null
  );
  const [showCommentForm, setShowCommentForm] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Load comments khi component mount
  useEffect(() => {
    fetchAssignmentComments(assignment.id);
    // Bắt đầu polling
    startPolling(assignment.id);

    return () => {
      stopPolling();
    };
  }, [assignment.id, fetchAssignmentComments, startPolling, stopPolling]);

  // Scroll to bottom khi có comment mới
  useEffect(() => {
    if (commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [comments.length]);

  // Xử lý submit comment
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!commentContent.trim() || (assignment.questions.length > 0 && !selectedQuestionId)) {
      return;
    }

    const result = await createAssignmentComment(assignment.id, {
      content: commentContent.trim(),
      questionId: selectedQuestionId || undefined,
    });

    if (result) {
      setCommentContent("");
      setSelectedQuestionId(null);
      setShowCommentForm(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl p-6 shadow-lg border border-border">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-foreground">
          Thảo luận ({total})
        </h2>
        <Button
          onClick={() => setShowCommentForm(!showCommentForm)}
          variant="outline"
        >
          {showCommentForm ? "Hủy" : "Thêm bình luận"}
        </Button>
      </div>

      {/* Comment form */}
      {showCommentForm && (
        <form onSubmit={handleSubmitComment} className="mb-6 p-4 bg-muted/40 rounded-xl border border-border">
          {assignment.questions.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-semibold text-foreground mb-2">
                Chọn câu hỏi để bình luận <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedQuestionId || ""}
                onChange={(e) => setSelectedQuestionId(e.target.value)}
                className="w-full px-4 py-2 bg-background rounded-xl border border-border text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                required
              >
                <option value="">-- Chọn câu hỏi --</option>
                {assignment.questions.map((question) => (
                  <option key={question.id} value={question.id}>
                    Câu {question.order}: {question.content.substring(0, 50)}
                    {question.content.length > 50 ? "..." : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-foreground mb-2">
              Nội dung bình luận <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              placeholder="Nhập nội dung bình luận của bạn..."
              rows={4}
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
                setSelectedQuestionId(null);
              }}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={!commentContent.trim() || (assignment.questions.length > 0 && !selectedQuestionId) || isLoading}
            >
              {isLoading ? "Đang gửi..." : "Gửi bình luận"}
            </Button>
          </div>
        </form>
      )}

      {/* Comments list */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <p className="text-sm font-semibold">Lỗi tải comments</p>
          <p className="text-xs mt-1">{error}</p>
        </div>
      )}

      {isLoading && comments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground animate-pulse">
          Đang tải comments...
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <div className="flex justify-center mb-2">
            <MessageSquare className="h-10 w-10 text-green-600" />
          </div>
          <p>Chưa có bình luận nào</p>
          <p className="text-sm mt-1">Hãy là người đầu tiên bình luận!</p>
        </div>
      ) : (
        <>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className="p-4 bg-muted/40 rounded-xl border border-border"
              >
                <div className="flex items-start gap-3 mb-2">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                    {comment.user.fullname.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-foreground">
                        {comment.user.fullname}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(comment.createdAt).toLocaleString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {comment.question && (
                      <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
                        <span className="font-semibold">Câu {comment.question.order}:</span>{" "}
                        {comment.question.content.substring(0, 100)}
                        {comment.question.content.length > 100 ? "..." : ""}
                      </div>
                    )}
                    <p className="text-foreground whitespace-pre-wrap">{comment.content}</p>
                  </div>
                </div>
              </div>
            ))}
            <div ref={commentsEndRef} />
          </div>

          {/* Load more button */}
          {hasMore && (
            <div className="mt-4 text-center">
              <Button
                onClick={() => loadMore(assignment.id)}
                variant="outline"
                disabled={isLoading}
              >
                {isLoading ? "Đang tải..." : "Tải thêm bình luận"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}


