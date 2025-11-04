import { useState, useCallback } from "react";

/**
 * Interface cho Submission từ teacher view
 */
export interface TeacherSubmission {
  id: string;
  content: string;
  grade: number | null;
  feedback: string | null;
  submittedAt: string;
  attempt?: number;
  student: {
    id: string;
    fullname: string;
    email: string;
  };
}

/**
 * Interface cho Submission Detail (khi GET single submission)
 */
export interface SubmissionDetail extends TeacherSubmission {
  assignment: {
    id: string;
    title: string;
    type: "ESSAY" | "QUIZ";
    dueDate: string | null;
    questions?: Array<{
      id: string;
      content: string;
      type: string;
      order: number;
      options?: Array<{
        id: string;
        label: string;
        content: string;
        isCorrect: boolean;
        order: number;
      }>;
    }>;
  };
  answers?: Array<{
    questionId: string;
    optionIds: string[];
  }>;
}

/**
 * Interface cho Submissions Response
 */
export interface SubmissionsResponse {
  submissions: TeacherSubmission[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Hook quản lý submissions cho teacher
 */
export function useTeacherSubmissions() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<TeacherSubmission[]>([]);
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
   * Lấy danh sách submissions với filter và pagination
   */
  const fetchSubmissions = useCallback(
    async (
      assignmentId: string,
      options?: {
        status?: "all" | "graded" | "ungraded";
        search?: string;
        page?: number;
        limit?: number;
      }
    ): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (options?.status && options.status !== "all") {
          params.append("status", options.status);
        }
        if (options?.search) {
          params.append("search", options.search);
        }
        if (options?.page) {
          params.append("page", options.page.toString());
        }
        if (options?.limit) {
          params.append("limit", options.limit.toString());
        }

        const url = `/api/assignments/${assignmentId}/submissions${
          params.toString() ? `?${params.toString()}` : ""
        }`;

        console.log(`[fetchSubmissions] Fetching: ${url}`);

        const response = await fetch(url);
        const result = await response.json();

        if (!response.ok) {
          console.error(
            "[fetchSubmissions] Lỗi response:",
            result?.message || response.statusText
          );
          throw new Error(
            result?.message || "Có lỗi xảy ra khi lấy danh sách bài nộp"
          );
        }

        const data = result.data as SubmissionsResponse;
        setSubmissions(data.submissions ?? []);
        setPagination({
          total: data.total ?? 0,
          page: data.page ?? 1,
          limit: data.limit ?? 50,
          hasMore: data.hasMore ?? false,
        });

        console.log(
          "[fetchSubmissions] Lấy danh sách bài nộp thành công:",
          data
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Có lỗi xảy ra";
        setError(msg);
        setSubmissions([]);
        console.error("[fetchSubmissions] Lỗi:", msg);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Lấy chi tiết một submission cụ thể
   */
  const fetchSubmissionDetail = useCallback(
    async (
      assignmentId: string,
      submissionId: string
    ): Promise<SubmissionDetail | null> => {
      try {
        setError(null);
        console.log(
          `[fetchSubmissionDetail] Lấy chi tiết submission: ${submissionId}`
        );

        const response = await fetch(
          `/api/assignments/${assignmentId}/submissions/${submissionId}`
        );
        const result = await response.json();

        if (!response.ok) {
          console.error(
            "[fetchSubmissionDetail] Lỗi response:",
            result?.message || response.statusText
          );
          throw new Error(
            result?.message || "Có lỗi xảy ra khi lấy chi tiết bài nộp"
          );
        }

        console.log(
          "[fetchSubmissionDetail] Lấy chi tiết bài nộp thành công:",
          result.data
        );
        return result.data as SubmissionDetail;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Có lỗi xảy ra";
        setError(msg);
        console.error("[fetchSubmissionDetail] Lỗi:", msg);
        return null;
      }
    },
    []
  );

  /**
   * Chấm bài: cập nhật grade và feedback
   */
  const gradeSubmission = useCallback(
    async (
      assignmentId: string,
      submissionId: string,
      grade: number,
      feedback?: string
    ): Promise<boolean> => {
      try {
        setError(null);
        console.log(
          `[gradeSubmission] Chấm bài: ${submissionId}, grade: ${grade}`
        );

        // Validate grade
        if (grade < 0 || grade > 10) {
          throw new Error("Điểm phải từ 0 đến 10");
        }

        const response = await fetch(
          `/api/assignments/${assignmentId}/submissions/${submissionId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              grade,
              feedback: feedback?.trim() || "",
            }),
          }
        );

        const result = await response.json();

        if (!response.ok) {
          console.error(
            "[gradeSubmission] Lỗi response:",
            result?.message || response.statusText
          );
          throw new Error(
            result?.message || "Có lỗi xảy ra khi chấm bài"
          );
        }

        // Cập nhật submission trong state
        setSubmissions((prev) =>
          prev.map((sub) =>
            sub.id === submissionId
              ? {
                  ...sub,
                  grade,
                  feedback: feedback?.trim() || null,
                }
              : sub
          )
        );

        console.log("[gradeSubmission] Chấm bài thành công:", result.data);
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Có lỗi xảy ra";
        setError(msg);
        console.error("[gradeSubmission] Lỗi:", msg);
        return false;
      }
    },
    []
  );

  /**
   * Tính toán thống kê từ submissions
   */
  const getStatistics = useCallback(() => {
    const total = submissions.length;
    const graded = submissions.filter((s) => s.grade !== null).length;
    const ungraded = total - graded;

    let totalGrade = 0;
    let gradedCount = 0;
    submissions.forEach((sub) => {
      if (sub.grade !== null) {
        totalGrade += sub.grade;
        gradedCount += 1;
      }
    });

    const averageGrade =
      gradedCount > 0 ? Math.round((totalGrade / gradedCount) * 10) / 10 : null;

    return {
      total,
      graded,
      ungraded,
      averageGrade,
    };
  }, [submissions]);

  return {
    submissions,
    isLoading,
    error,
    pagination,
    fetchSubmissions,
    fetchSubmissionDetail,
    gradeSubmission,
    getStatistics,
  };
}

