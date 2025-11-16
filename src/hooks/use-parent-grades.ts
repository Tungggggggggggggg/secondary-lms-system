import { useState, useCallback } from "react";

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

  /**
   * Lấy danh sách grades của một con từ tất cả classrooms
   */
  const fetchChildGrades = useCallback(async (childId: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      console.log(`[fetchChildGrades] Bắt đầu lấy danh sách điểm số cho con: ${childId}`);

      const response = await fetch(`/api/parent/children/${childId}/grades`);
      const result = await response.json();

      if (!response.ok) {
        console.error(
          "[fetchChildGrades] Lỗi response:",
          result?.message || response.statusText
        );
        throw new Error(
          result?.message || "Có lỗi xảy ra khi lấy danh sách điểm số"
        );
      }

      setGrades(result.data ?? []);
      setStatistics(result.statistics ?? { averageGrade: 0 });
      console.log(
        "[fetchChildGrades] Lấy danh sách điểm số thành công:",
        result.data
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Có lỗi xảy ra";
      setError(msg);
      setGrades([]);
      console.error("[fetchChildGrades] Lỗi:", msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Lấy danh sách grades của một con trong một classroom cụ thể
   */
  const fetchChildClassroomGrades = useCallback(
    async (childId: string, classroomId: string): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);
        console.log(
          `[fetchChildClassroomGrades] Bắt đầu lấy danh sách điểm số cho con: ${childId} trong lớp: ${classroomId}`
        );

        const response = await fetch(
          `/api/parent/children/${childId}/classrooms/${classroomId}/grades`
        );
        const result = await response.json();

        if (!response.ok) {
          console.error(
            "[fetchChildClassroomGrades] Lỗi response:",
            result?.message || response.statusText
          );
          throw new Error(
            result?.message || "Có lỗi xảy ra khi lấy danh sách điểm số"
          );
        }

        setGrades(result.data ?? []);
        setStatistics(result.statistics ?? { averageGrade: 0 });
        console.log(
          "[fetchChildClassroomGrades] Lấy danh sách điểm số thành công:",
          result.data
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Có lỗi xảy ra";
        setError(msg);
        setGrades([]);
        console.error("[fetchChildClassroomGrades] Lỗi:", msg);
      } finally {
        setIsLoading(false);
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

