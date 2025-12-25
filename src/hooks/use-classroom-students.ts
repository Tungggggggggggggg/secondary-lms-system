import { useCallback } from "react";
import useSWR from "swr";

/**
 * Interface cho Student trong classroom với thống kê
 */
export interface ClassroomStudent {
  id: string;
  fullname: string;
  email: string;
  joinedAt: string;
  parents?: Array<{
    id: string;
    fullname: string;
    email: string;
  }>;
  stats: {
    totalAssignments: number;
    submittedCount: number;
    gradedCount: number;
    averageGrade: number | null;
  };
}

/**
 * Hook quản lý danh sách học sinh trong classroom
 */
export function useClassroomStudents(classroomId?: string) {
  type ApiResponse = { success?: boolean; data?: ClassroomStudent[]; message?: string };

  const fetcher = useCallback(async (url: string): Promise<ClassroomStudent[]> => {
    const res = await fetch(url, { cache: "no-store" });
    const json = (await res.json()) as ApiResponse;
    if (!res.ok || json?.success === false) {
      const msg = json?.message || res.statusText || "Có lỗi xảy ra khi lấy danh sách học sinh";
      throw new Error(msg);
    }
    return Array.isArray(json?.data) ? json.data : [];
  }, []);

  const key = classroomId ? `/api/classrooms/${encodeURIComponent(classroomId)}/students` : null;
  const { data, error, isLoading, mutate } = useSWR<ClassroomStudent[]>(key, fetcher, {
    shouldRetryOnError: false,
    revalidateOnFocus: false,
    dedupingInterval: 15000,
  });

  const students = data ?? [];

  /**
   * Tính toán thống kê tổng quan
   */
  const getStatistics = useCallback(() => {
    const totalStudents = students.length;
    const totalAssignments = students[0]?.stats.totalAssignments || 0;

    let totalSubmissions = 0;
    let totalGraded = 0;
    let totalGradeSum = 0;
    let gradedCount = 0;

    students.forEach((student) => {
      totalSubmissions += student.stats.submittedCount;
      totalGraded += student.stats.gradedCount;
      if (student.stats.averageGrade !== null) {
        totalGradeSum += student.stats.averageGrade;
        gradedCount += 1;
      }
    });

    const averageGrade =
      gradedCount > 0 ? totalGradeSum / gradedCount : null;
    const submissionRate =
      totalStudents > 0 && totalAssignments > 0
        ? (totalSubmissions / (totalStudents * totalAssignments)) * 100
        : 0;

    return {
      totalStudents,
      totalAssignments,
      totalSubmissions,
      totalGraded,
      averageGrade: averageGrade ? Math.round(averageGrade * 10) / 10 : null,
      submissionRate: Math.round(submissionRate * 10) / 10,
    };
  }, [students]);

  /**
   * Tìm kiếm học sinh theo tên hoặc email
   */
  const searchStudents = useCallback(
    (query: string): ClassroomStudent[] => {
      if (!query.trim()) return students;

      const searchLower = query.trim().toLowerCase();
      return students.filter(
        (student) =>
          student.fullname.toLowerCase().includes(searchLower) ||
          student.email.toLowerCase().includes(searchLower)
      );
    },
    [students]
  );

  /**
   * Lọc học sinh theo điều kiện
   */
  const filterStudents = useCallback(
    (filter: {
      hasSubmissions?: boolean;
      hasGraded?: boolean;
      minAverageGrade?: number;
    }): ClassroomStudent[] => {
      return students.filter((student) => {
        if (filter.hasSubmissions && student.stats.submittedCount === 0) {
          return false;
        }
        if (filter.hasGraded && student.stats.gradedCount === 0) {
          return false;
        }
        if (
          filter.minAverageGrade !== undefined &&
          (student.stats.averageGrade === null ||
            student.stats.averageGrade < filter.minAverageGrade)
        ) {
          return false;
        }
        return true;
      });
    },
    [students]
  );

  return {
    students,
    isLoading,
    error: error ? String(error) : null,
    refresh: async () => {
      await mutate();
    },
    getStatistics,
    searchStudents,
    filterStudents,
  };
}

