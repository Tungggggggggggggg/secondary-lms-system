import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Interface cho Grade entry (tương tự use-student-grades.ts)
 */
export interface GradeEntry {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  assignmentType: string;
  grade: number | null;
  feedback: string | null;
  submittedAt: string | null;
  dueDate?: string | null;
  status: "pending" | "submitted" | "graded";
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
}

/**
 * Interface cho Statistics
 */
export interface GradeStatistics {
  totalSubmissions?: number;
  totalGraded?: number;
  totalPending?: number;
  averageGrade: number;
}

/**
 * Hook quản lý grades cho parent (xem điểm của con)
 */
export function useParentGrades() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [grades, setGrades] = useState<GradeEntry[]>([]);
  const [statistics, setStatistics] = useState<GradeStatistics>({
    averageGrade: 0,
  });

  const REQUEST_TIMEOUT_MS = 20_000;

  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  /**
   * Lấy danh sách grades của một con từ tất cả classrooms
   */
  const fetchChildGrades = useCallback(async (childId: string): Promise<void> => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    let didTimeout = false;
    const timeoutId = setTimeout(() => {
      didTimeout = true;
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    try {
      if (mountedRef.current) {
        setIsLoading(true);
        setError(null);
      }

      const response = await fetch(`/api/parent/children/${childId}/grades`, {
        signal: controller.signal,
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message || "Có lỗi xảy ra khi lấy danh sách điểm số"
        );
      }

      if (!mountedRef.current) return;

      setGrades(result.data ?? []);
      setStatistics(result.statistics ?? { averageGrade: 0 });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        if (!didTimeout) return;
        const msg = "Tải danh sách điểm số quá lâu. Vui lòng thử lại.";
        if (!mountedRef.current) return;
        setError(msg);
        setGrades([]);
        return;
      }
      const msg = err instanceof Error ? err.message : "Có lỗi xảy ra";
      if (!mountedRef.current) return;

      setError(msg);
      setGrades([]);
    } finally {
      clearTimeout(timeoutId);
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  /**
   * Lấy danh sách grades của một con trong một classroom cụ thể
   */
  const fetchChildClassroomGrades = useCallback(
    async (childId: string, classroomId: string): Promise<void> => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      let didTimeout = false;
      const timeoutId = setTimeout(() => {
        didTimeout = true;
        controller.abort();
      }, REQUEST_TIMEOUT_MS);

      try {
        if (mountedRef.current) {
          setIsLoading(true);
          setError(null);
        }

        const response = await fetch(
          `/api/parent/children/${childId}/classrooms/${classroomId}/grades`,
          { signal: controller.signal }
        );
        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result?.message || "Có lỗi xảy ra khi lấy danh sách điểm số"
          );
        }

        if (!mountedRef.current) return;

        setGrades(result.data ?? []);
        setStatistics(result.statistics ?? { averageGrade: 0 });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          if (!didTimeout) return;
          const msg = "Tải danh sách điểm số quá lâu. Vui lòng thử lại.";
          if (!mountedRef.current) return;
          setError(msg);
          setGrades([]);
          return;
        }
        const msg = err instanceof Error ? err.message : "Có lỗi xảy ra";
        if (!mountedRef.current) return;

        setError(msg);
        setGrades([]);
      } finally {
        clearTimeout(timeoutId);
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    []
  );

  return {
    grades,
    statistics,
    isLoading,
    error,
    fetchChildGrades,
    fetchChildClassroomGrades,
  };
}

