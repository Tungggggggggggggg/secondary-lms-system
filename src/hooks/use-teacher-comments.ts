import { useState, useCallback } from "react";

/**
 * Interface cho Comment từ teacher view
 */
export interface TeacherComment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    fullname: string;
    email: string;
  };
  question: {
    id: string;
    content: string;
    order: number;
  };
}

/**
 * Interface cho Comments Response
 */
export interface CommentsResponse {
  comments: TeacherComment[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Hook quản lý comments cho teacher
 */
export function useTeacherComments() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<TeacherComment[]>([]);
  const [pagination, setPagination] = useState<{
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  }>({
    total: 0,
    page: 1,
    limit: 50,
    hasMore: false,
  });

  /**
   * Lấy danh sách comments với filter và pagination
   */
  const fetchComments = useCallback(
    async (
      assignmentId: string,
      options?: {
        questionId?: string;
        studentId?: string;
        page?: number;
        limit?: number;
      }
    ): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (options?.questionId) {
          params.append("questionId", options.questionId);
        }
        if (options?.studentId) {
          params.append("studentId", options.studentId);
        }
        if (options?.page) {
          params.append("page", options.page.toString());
        }
        if (options?.limit) {
          params.append("limit", options.limit.toString());
        }

        const url = `/api/teachers/assignments/${assignmentId}/comments${
          params.toString() ? `?${params.toString()}` : ""
        }`;

        console.log(`[fetchComments] Fetching: ${url}`);

        const response = await fetch(url);
        const result = await response.json();

        if (!response.ok) {
          console.error(
            "[fetchComments] Lỗi response:",
            result?.message || response.statusText
          );
          throw new Error(
            result?.message || "Có lỗi xảy ra khi lấy danh sách bình luận"
          );
        }

        const data = result.data as CommentsResponse;
        setComments(data.comments ?? []);
        setPagination({
          total: data.total ?? 0,
          page: data.page ?? 1,
          limit: data.limit ?? 50,
          hasMore: data.hasMore ?? false,
        });

        console.log(
          "[fetchComments] Lấy danh sách bình luận thành công:",
          data
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Có lỗi xảy ra";
        setError(msg);
        setComments([]);
        console.error("[fetchComments] Lỗi:", msg);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Lọc comments theo question
   */
  const getCommentsByQuestion = useCallback(
    (questionId: string): TeacherComment[] => {
      return comments.filter((comment) => comment.question.id === questionId);
    },
    [comments]
  );

  /**
   * Lọc comments theo student
   */
  const getCommentsByStudent = useCallback(
    (studentId: string): TeacherComment[] => {
      return comments.filter((comment) => comment.user.id === studentId);
    },
    [comments]
  );

  /**
   * Nhóm comments theo question
   */
  const groupCommentsByQuestion = useCallback(() => {
    const grouped = new Map<string, TeacherComment[]>();
    comments.forEach((comment) => {
      const questionId = comment.question.id;
      if (!grouped.has(questionId)) {
        grouped.set(questionId, []);
      }
      grouped.get(questionId)!.push(comment);
    });
    return grouped;
  }, [comments]);

  /**
   * Nhóm comments theo student
   */
  const groupCommentsByStudent = useCallback(() => {
    const grouped = new Map<string, TeacherComment[]>();
    comments.forEach((comment) => {
      const studentId = comment.user.id;
      if (!grouped.has(studentId)) {
        grouped.set(studentId, []);
      }
      grouped.get(studentId)!.push(comment);
    });
    return grouped;
  }, [comments]);

  /**
   * Tính toán thống kê
   */
  const getStatistics = useCallback(() => {
    const total = comments.length;
    const uniqueStudents = new Set(comments.map((c) => c.user.id)).size;
    const uniqueQuestions = new Set(comments.map((c) => c.question.id)).size;

    return {
      total,
      uniqueStudents,
      uniqueQuestions,
    };
  }, [comments]);

  return {
    comments,
    isLoading,
    error,
    pagination,
    fetchComments,
    getCommentsByQuestion,
    getCommentsByStudent,
    groupCommentsByQuestion,
    groupCommentsByStudent,
    getStatistics,
  };
}

