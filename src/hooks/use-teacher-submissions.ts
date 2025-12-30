import { useState, useCallback } from "react";
import fetcher from "@/lib/fetcher";

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
  // Extended fields for file-based submissions
  isFileSubmission?: boolean;
  filesCount?: number;
  // Khi là bài essay+BOTH, fileSubmissionId dùng để tải file từ card văn bản
  fileSubmissionId?: string;
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
  presentation?: {
    questionOrder?: string[];
    optionOrder?: Record<string, string[]>;
    seed?: number | string;
    versionHash?: string;
  } | null;
  contentSnapshot?: {
    versionHash?: string;
    questions?: Array<{
      id: string;
      content: string;
      type: string;
      options?: Array<{
        id: string;
        label: string;
        content: string;
        isCorrect: boolean;
      }>;
    }>;
  } | null;
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
        // Validation assignmentId
        if (!assignmentId || assignmentId === "undefined" || assignmentId === "null") {
          const errorMsg = `[fetchSubmissions] AssignmentId không hợp lệ: "${assignmentId}"`;
          console.error(errorMsg);
          throw new Error("ID bài tập không hợp lệ");
        }

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

        console.log(`[fetchSubmissions] Bắt đầu lấy danh sách bài nộp cho assignment: ${assignmentId}`);
        console.log(`[fetchSubmissions] URL: ${url}`);
        console.log(`[fetchSubmissions] Options:`, options);

        const result = await fetcher<{ success: true; data: SubmissionsResponse }>(url);
        const data = result.data as SubmissionsResponse;

        // Merge file-based submissions vào cùng card với bài essay (nếu có) theo student.id
        const raw = data.submissions ?? [];
        const items: TeacherSubmission[] = raw.map((s) => ({ ...s }));

        // Map studentId -> index của submission text đầu tiên
        const textIndexByStudent = new Map<string, number>();
        items.forEach((s, idx) => {
          if (!s.isFileSubmission && s.student?.id && !textIndexByStudent.has(s.student.id)) {
            textIndexByStudent.set(s.student.id, idx);
          }
        });

        const merged: TeacherSubmission[] = [];
        for (const s of items) {
          if (s.isFileSubmission && s.student?.id) {
            const idx = textIndexByStudent.get(s.student.id);
            if (idx !== undefined) {
              const target = items[idx];
              const existing = target.filesCount ?? 0;
              target.filesCount = existing + (s.filesCount ?? 0);
              if (!target.fileSubmissionId) {
                target.fileSubmissionId = s.id;
              }
              // Không push card file riêng nữa
              continue;
            }
          }
          merged.push(s);
        }

        setSubmissions(merged);
        setPagination({
          total: merged.length,
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

        const result = await fetcher<{ success: true; data: SubmissionDetail }>(
          `/api/assignments/${assignmentId}/submissions/${submissionId}`
        );

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

        const result = await fetcher<{ success: true; data: unknown }>(
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

