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

type AllGradesSort = "newest" | "grade_desc" | "grade_asc" | "due_date" | "classroom";

type ClassroomGradesSort = "newest" | "grade_desc" | "grade_asc" | "due_date";

type GradeStatusFilter = "all" | "graded" | "submitted" | "pending";

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
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
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);

  /**
   * Lấy danh sách grades từ tất cả classrooms
   */
  const fetchAllGrades = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      console.log("[fetchAllGrades] Bắt đầu lấy danh sách điểm số...");

      const response = await fetch("/api/students/grades?page=1&pageSize=20");
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
      setPagination(result.pagination ?? null);
      console.log(
        "[fetchAllGrades] Lấy danh sách điểm số thành công:",
        result.data
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Có lỗi xảy ra";
      setError(msg);
      setGrades([]);
      setPagination(null);
      console.error("[fetchAllGrades] Lỗi:", msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchAllGradesPaged = useCallback(
    async (
      options: {
        page?: number;
        pageSize?: number;
        q?: string;
        sort?: AllGradesSort;
        append?: boolean;
      } = {}
    ): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);

        const page = options.page ?? 1;
        const pageSize = options.pageSize ?? 20;

        const sp = new URLSearchParams();
        sp.set("page", String(page));
        sp.set("pageSize", String(pageSize));
        if (options.q) sp.set("q", options.q);
        if (options.sort) sp.set("sort", options.sort);

        const response = await fetch(`/api/students/grades?${sp.toString()}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.message || "Có lỗi xảy ra khi lấy danh sách điểm số");
        }

        const nextGrades = (result.data ?? []) as GradeEntry[];
        setGrades((prev) => (options.append ? [...prev, ...nextGrades] : nextGrades));
        setStatistics(result.statistics ?? { averageGrade: 0 });
        setPagination(result.pagination ?? null);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Có lỗi xảy ra";
        setError(msg);
        setGrades([]);
        setPagination(null);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

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
        setPagination(result.pagination ?? null);
        console.log(
          "[fetchClassroomGrades] Lấy danh sách điểm số thành công:",
          result.data
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Có lỗi xảy ra";
        setError(msg);
        setGrades([]);
        setPagination(null);
        console.error("[fetchClassroomGrades] Lỗi:", msg);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const fetchClassroomGradesPaged = useCallback(
    async (
      classroomId: string,
      options: {
        page?: number;
        pageSize?: number;
        status?: GradeStatusFilter;
        sort?: ClassroomGradesSort;
        append?: boolean;
      } = {}
    ): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);

        const page = options.page ?? 1;
        const pageSize = options.pageSize ?? 20;

        const sp = new URLSearchParams();
        sp.set("page", String(page));
        sp.set("pageSize", String(pageSize));
        if (options.status) sp.set("status", options.status);
        if (options.sort) sp.set("sort", options.sort);

        const response = await fetch(
          `/api/students/classrooms/${classroomId}/grades?${sp.toString()}`
        );
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.message || "Có lỗi xảy ra khi lấy danh sách điểm số");
        }

        const nextGrades = (result.data ?? []) as GradeEntry[];
        setGrades((prev) => (options.append ? [...prev, ...nextGrades] : nextGrades));
        setStatistics(result.statistics ?? { averageGrade: 0 });
        setPagination(result.pagination ?? null);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Có lỗi xảy ra";
        setError(msg);
        setGrades([]);
        setPagination(null);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    grades,
    statistics,
    pagination,
    isLoading,
    error,
    fetchAllGrades,
    fetchAllGradesPaged,
    fetchClassroomGrades,
    fetchClassroomGradesPaged,
  };
}
