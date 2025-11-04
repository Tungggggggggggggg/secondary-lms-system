import { useState, useCallback } from "react";
import { AssignmentT } from "./use-assignments";

/**
 * Interface cho Assignment với submission của student
 */
export interface StudentAssignment extends AssignmentT {
  classroom?: {
    id: string;
    name: string;
    code: string;
    icon: string;
    teacher?: {
      id: string;
      fullname: string;
      email: string;
    };
  } | null;
  submission?: {
    id: string;
    content: string;
    grade: number | null;
    feedback: string | null;
    submittedAt: string;
    attempt?: number;
  } | null;
  status: "pending" | "submitted" | "overdue";
}

/**
 * Interface cho Quiz Answer
 */
export interface QuizAnswer {
  questionId: string;
  optionIds: string[];
}

/**
 * Interface cho Submission request
 */
export interface SubmitAssignmentRequest {
  content?: string; // Cho essay
  answers?: QuizAnswer[]; // Cho quiz
}

/**
 * Interface cho Submission response
 */
export interface SubmissionResponse {
  id: string;
  assignmentId: string;
  content: string;
  grade: number | null;
  feedback: string | null;
  submittedAt: string;
  attempt?: number;
  assignment: {
    id: string;
    title: string;
    dueDate: string | null;
  };
}

/**
 * Hook quản lý assignments cho student
 */
export function useStudentAssignments() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<StudentAssignment[]>([]);

  /**
   * Lấy danh sách assignments từ tất cả classrooms mà student tham gia
   */
  const fetchAllAssignments = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      console.log("[fetchAllAssignments] Bắt đầu lấy danh sách bài tập...");

      const response = await fetch("/api/students/assignments");
      const result = await response.json();

      if (!response.ok) {
        console.error(
          "[fetchAllAssignments] Lỗi response:",
          result?.message || response.statusText
        );
        throw new Error(
          result?.message || "Có lỗi xảy ra khi lấy danh sách bài tập"
        );
      }

      setAssignments(result.data ?? []);
      console.log(
        "[fetchAllAssignments] Lấy danh sách bài tập thành công:",
        result.data
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Có lỗi xảy ra";
      setError(msg);
      setAssignments([]);
      console.error("[fetchAllAssignments] Lỗi:", msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Lấy danh sách assignments của một classroom cụ thể
   */
  const fetchClassroomAssignments = useCallback(
    async (classroomId: string): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);
        console.log(
          `[fetchClassroomAssignments] Bắt đầu lấy danh sách bài tập cho classroom: ${classroomId}`
        );

        const response = await fetch(
          `/api/students/classrooms/${classroomId}/assignments`
        );
        const result = await response.json();

        if (!response.ok) {
          console.error(
            "[fetchClassroomAssignments] Lỗi response:",
            result?.message || response.statusText
          );
          throw new Error(
            result?.message || "Có lỗi xảy ra khi lấy danh sách bài tập"
          );
        }

        setAssignments(result.data ?? []);
        console.log(
          "[fetchClassroomAssignments] Lấy danh sách bài tập thành công:",
          result.data
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Có lỗi xảy ra";
        setError(msg);
        setAssignments([]);
        console.error("[fetchClassroomAssignments] Lỗi:", msg);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Submit assignment (essay hoặc quiz)
   */
  const submitAssignment = useCallback(
    async (
      assignmentId: string,
      data: SubmitAssignmentRequest
    ): Promise<SubmissionResponse | null> => {
      try {
        setIsLoading(true);
        setError(null);
        console.log(
          `[submitAssignment] Bắt đầu submit assignment: ${assignmentId}`,
          data
        );

        const response = await fetch(
          `/api/students/assignments/${assignmentId}/submit`,
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
          console.error("[submitAssignment] Lỗi response:", result.message);
          throw new Error(
            result.message || "Có lỗi xảy ra khi nộp bài tập"
          );
        }

        console.log("[submitAssignment] Submit bài tập thành công:", result.data);
        return result.data;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Có lỗi xảy ra";
        setError(msg);
        console.error("[submitAssignment] Lỗi:", msg);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Update submission (chỉ khi chưa được chấm)
   * Hỗ trợ cả essay (content) và quiz (answers)
   */
  const updateSubmission = useCallback(
    async (
      assignmentId: string,
      data: SubmitAssignmentRequest
    ): Promise<SubmissionResponse | null> => {
      try {
        setIsLoading(true);
        setError(null);
        console.log(
          `[updateSubmission] Bắt đầu update submission: ${assignmentId}`,
          data
        );

        const response = await fetch(
          `/api/students/assignments/${assignmentId}/submit`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
          }
        );

        const result = await response.json();

        if (!response.ok) {
          console.error("[updateSubmission] Lỗi response:", result.message);
          throw new Error(
            result.message || "Có lỗi xảy ra khi cập nhật bài nộp"
          );
        }

        console.log("[updateSubmission] Update submission thành công:", result.data);
        return result.data;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Có lỗi xảy ra";
        setError(msg);
        console.error("[updateSubmission] Lỗi:", msg);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Lấy chi tiết assignment
   */
  const fetchAssignmentDetail = useCallback(
    async (assignmentId: string): Promise<StudentAssignmentDetail | null> => {
      try {
        setIsLoading(true);
        setError(null);
        console.log(
          `[fetchAssignmentDetail] Bắt đầu lấy chi tiết assignment: ${assignmentId}`
        );

        const response = await fetch(`/api/students/assignments/${assignmentId}`);
        const result = await response.json();

        if (!response.ok) {
          console.error(
            "[fetchAssignmentDetail] Lỗi response:",
            result?.message || response.statusText
          );
          throw new Error(
            result?.message || "Có lỗi xảy ra khi lấy chi tiết bài tập"
          );
        }

        console.log(
          "[fetchAssignmentDetail] Lấy chi tiết bài tập thành công:",
          result.data
        );
        return result.data as StudentAssignmentDetail;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Có lỗi xảy ra";
        setError(msg);
        console.error("[fetchAssignmentDetail] Lỗi:", msg);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Lấy submission của assignment
   */
  const fetchSubmission = useCallback(
    async (assignmentId: string): Promise<SubmissionResponse | null> => {
      try {
        setIsLoading(true);
        setError(null);
        console.log(
          `[fetchSubmission] Bắt đầu lấy submission cho assignment: ${assignmentId}`
        );

        const response = await fetch(
          `/api/students/assignments/${assignmentId}/submission`
        );
        const result = await response.json();

        if (!response.ok) {
          console.error(
            "[fetchSubmission] Lỗi response:",
            result?.message || response.statusText
          );
          throw new Error(
            result?.message || "Có lỗi xảy ra khi lấy bài nộp"
          );
        }

        if (!result.data) {
          console.log("[fetchSubmission] Chưa có bài nộp");
          return null;
        }

        console.log("[fetchSubmission] Lấy bài nộp thành công:", result.data);
        return result.data as SubmissionResponse;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Có lỗi xảy ra";
        setError(msg);
        console.error("[fetchSubmission] Lỗi:", msg);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    assignments,
    isLoading,
    error,
    fetchAllAssignments,
    fetchClassroomAssignments,
    fetchAssignmentDetail,
    fetchSubmission,
    submitAssignment,
    updateSubmission,
  };
}

/**
 * Interface cho Student Assignment Detail
 */
export interface StudentAssignmentDetail {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  type: "ESSAY" | "QUIZ";
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    fullname: string;
    email: string;
  };
  classroom: {
    id: string;
    name: string;
    code: string;
    icon: string;
    teacher: {
      id: string;
      fullname: string;
      email: string;
    };
  };
  questions: Array<{
    id: string;
    content: string;
    type: string;
    order: number;
    options: Array<{
      id: string;
      label: string;
      content: string;
      order: number;
    }>;
    _count: {
      comments: number;
    };
  }>;
  _count: {
    submissions: number;
    questions: number;
  };
}
