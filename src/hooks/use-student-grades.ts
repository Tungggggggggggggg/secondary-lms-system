import { useState, useCallback } from "react";

/**
 * Interface cho Grade entry
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
  totalGraded?: number;
  totalSubmissions?: number;
  totalPending?: number;
  averageGrade: number;
}

/**
 * Hook quản lý grades cho student
 */
export function useStudentGrades() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [grades, setGrades] = useState<GradeEntry[]>([]);
  const [statistics, setStatistics] = useState<GradeStatistics>({
    averageGrade: 0,
  });

  /**
   * Lấy danh sách grades từ tất cả classrooms
   */
  const fetchAllGrades = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      console.log("[fetchAllGrades] Bắt đầu lấy danh sách điểm số...");

      const response = await fetch("/api/students/grades");
      const result = await response.json();

      if (!response.ok) {
        console.error(
          "[fetchAllGrades] Lỗi response:",
          result?.message || response.statusText
        );
        throw new Error(
          result?.message || "Có lỗi xảy ra khi lấy danh sách điểm số"
        );
      }

      setGrades(result.data ?? []);
      setStatistics(result.statistics ?? { averageGrade: 0 });
      console.log(
        "[fetchAllGrades] Lấy danh sách điểm số thành công:",
        result.data
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Có lỗi xảy ra";
      setError(msg);
      setGrades([]);
      console.error("[fetchAllGrades] Lỗi:", msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Lấy danh sách grades của một classroom cụ thể
   */
  const fetchClassroomGrades = useCallback(
    async (classroomId: string): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);
        console.log(
          `[fetchClassroomGrades] Bắt đầu lấy danh sách điểm số cho classroom: ${classroomId}`
        );

        const response = await fetch(
          `/api/students/classrooms/${classroomId}/grades`
        );
        const result = await response.json();

        if (!response.ok) {
          console.error(
            "[fetchClassroomGrades] Lỗi response:",
            result?.message || response.statusText
          );
          throw new Error(
            result?.message || "Có lỗi xảy ra khi lấy danh sách điểm số"
          );
        }

        setGrades(result.data ?? []);
        setStatistics(result.statistics ?? { averageGrade: 0 });
        console.log(
          "[fetchClassroomGrades] Lấy danh sách điểm số thành công:",
          result.data
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Có lỗi xảy ra";
        setError(msg);
        setGrades([]);
        console.error("[fetchClassroomGrades] Lỗi:", msg);
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
    fetchAllGrades,
    fetchClassroomGrades,
  };
}
