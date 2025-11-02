import { useState, useCallback, useEffect, useRef } from "react";

/**
 * Interface cho Comment
 */
export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    fullname: string;
    email: string;
  };
  question?: {
    id: string;
    content: string;
    order: number;
  };
}

/**
 * Interface cho Comments Response
 */
export interface CommentsResponse {
  comments: Comment[];
  total: number;
  page: number;
  hasMore: boolean;
}

/**
 * Interface cho Comment Request
 */
export interface CommentRequest {
  content: string;
  questionId?: string; // Required for assignment level comments
}

/**
 * Hook quản lý comments cho assignments và questions
 */
export function useAssignmentComments() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Lấy comments của assignment (tất cả questions)
   */
  const fetchAssignmentComments = useCallback(
    async (
      assignmentId: string,
      pageNum: number = 1,
      limit: number = 20
    ): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);
        console.log(
          `[fetchAssignmentComments] Bắt đầu lấy comments cho assignment: ${assignmentId} (page ${pageNum})`
        );

        const response = await fetch(
          `/api/students/assignments/${assignmentId}/comments?page=${pageNum}&limit=${limit}`
        );
        const result = await response.json();

        if (!response.ok) {
          console.error(
            "[fetchAssignmentComments] Lỗi response:",
            result?.message || response.statusText
          );
          throw new Error(
            result?.message || "Có lỗi xảy ra khi lấy comments"
          );
        }

        const data = result.data as CommentsResponse;
        if (pageNum === 1) {
          setComments(data.comments);
        } else {
          setComments((prev) => [...prev, ...data.comments]);
        }
        setTotal(data.total);
        setPage(data.page);
        setHasMore(data.hasMore);
        console.log(
          "[fetchAssignmentComments] Lấy comments thành công:",
          data.comments.length
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Có lỗi xảy ra";
        setError(msg);
        console.error("[fetchAssignmentComments] Lỗi:", msg);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Lấy comments của question
   */
  const fetchQuestionComments = useCallback(
    async (
      questionId: string,
      pageNum: number = 1,
      limit: number = 20
    ): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);
        console.log(
          `[fetchQuestionComments] Bắt đầu lấy comments cho question: ${questionId} (page ${pageNum})`
        );

        const response = await fetch(
          `/api/students/questions/${questionId}/comments?page=${pageNum}&limit=${limit}`
        );
        const result = await response.json();

        if (!response.ok) {
          console.error(
            "[fetchQuestionComments] Lỗi response:",
            result?.message || response.statusText
          );
          throw new Error(
            result?.message || "Có lỗi xảy ra khi lấy comments"
          );
        }

        const data = result.data as CommentsResponse;
        if (pageNum === 1) {
          setComments(data.comments);
        } else {
          setComments((prev) => [...prev, ...data.comments]);
        }
        setTotal(data.total);
        setPage(data.page);
        setHasMore(data.hasMore);
        console.log(
          "[fetchQuestionComments] Lấy comments thành công:",
          data.comments.length
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Có lỗi xảy ra";
        setError(msg);
        console.error("[fetchQuestionComments] Lỗi:", msg);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Tạo comment mới cho assignment (cần questionId)
   */
  const createAssignmentComment = useCallback(
    async (
      assignmentId: string,
      data: CommentRequest
    ): Promise<Comment | null> => {
      try {
        setIsLoading(true);
        setError(null);
        console.log(
          `[createAssignmentComment] Bắt đầu tạo comment cho assignment: ${assignmentId}`
        );

        if (!data.questionId) {
          throw new Error("questionId is required for assignment comments");
        }

        const response = await fetch(
          `/api/students/assignments/${assignmentId}/comments`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
          }
        );

        const result = await response.json();

        if (!response.ok) {
          console.error("[createAssignmentComment] Lỗi response:", result.message);
          throw new Error(
            result.message || "Có lỗi xảy ra khi tạo comment"
          );
        }

        console.log("[createAssignmentComment] Tạo comment thành công:", result.data);
        // Thêm comment mới vào đầu danh sách
        setComments((prev) => [result.data, ...prev]);
        setTotal((prev) => prev + 1);
        return result.data as Comment;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Có lỗi xảy ra";
        setError(msg);
        console.error("[createAssignmentComment] Lỗi:", msg);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Tạo comment mới cho question
   */
  const createQuestionComment = useCallback(
    async (questionId: string, content: string): Promise<Comment | null> => {
      try {
        setIsLoading(true);
        setError(null);
        console.log(
          `[createQuestionComment] Bắt đầu tạo comment cho question: ${questionId}`
        );

        const response = await fetch(`/api/students/questions/${questionId}/comments`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ content }),
        });

        const result = await response.json();

        if (!response.ok) {
          console.error("[createQuestionComment] Lỗi response:", result.message);
          throw new Error(
            result.message || "Có lỗi xảy ra khi tạo comment"
          );
        }

        console.log("[createQuestionComment] Tạo comment thành công:", result.data);
        // Thêm comment mới vào đầu danh sách
        setComments((prev) => [result.data, ...prev]);
        setTotal((prev) => prev + 1);
        return result.data as Comment;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Có lỗi xảy ra";
        setError(msg);
        console.error("[createQuestionComment] Lỗi:", msg);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Load more comments (pagination)
   */
  const loadMore = useCallback(
    async (assignmentId?: string, questionId?: string) => {
      if (!hasMore || isLoading) return;

      const nextPage = page + 1;
      if (assignmentId) {
        await fetchAssignmentComments(assignmentId, nextPage);
      } else if (questionId) {
        await fetchQuestionComments(questionId, nextPage);
      }
    },
    [hasMore, isLoading, page, fetchAssignmentComments, fetchQuestionComments]
  );

  /**
   * Bắt đầu polling để update comments tự động (30 giây)
   */
  const startPolling = useCallback(
    (assignmentId?: string, questionId?: string) => {
      // Clear interval cũ nếu có
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }

      // Chỉ poll khi tab active
      const poll = () => {
        if (document.hidden) return; // Không poll khi tab inactive

        if (assignmentId) {
          fetchAssignmentComments(assignmentId, 1);
        } else if (questionId) {
          fetchQuestionComments(questionId, 1);
        }
      };

      // Poll mỗi 30 giây
      pollingIntervalRef.current = setInterval(poll, 30000);
    },
    [fetchAssignmentComments, fetchQuestionComments]
  );

  /**
   * Dừng polling
   */
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // Cleanup polling khi unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    comments,
    total,
    page,
    hasMore,
    isLoading,
    error,
    fetchAssignmentComments,
    fetchQuestionComments,
    createAssignmentComment,
    createQuestionComment,
    loadMore,
    startPolling,
    stopPolling,
  };
}


