import { useState, useCallback } from "react";

/**
 * Interface cho Student trong classroom với thống kê
 */
export interface ClassroomStudent {
  id: string;
  fullname: string;
  email: string;
  joinedAt: string;
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
export function useClassroomStudents() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<ClassroomStudent[]>([]);

  /**
   * Lấy danh sách học sinh trong classroom
   */
  const fetchClassroomStudents = useCallback(
    async (classroomId: string): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);
        console.log(
          `[fetchClassroomStudents] Bắt đầu lấy danh sách học sinh cho classroom: ${classroomId}`
        );

        const response = await fetch(`/api/classrooms/${classroomId}/students`);
        const result = await response.json();

        if (!response.ok) {
          console.error(
            "[fetchClassroomStudents] Lỗi response:",
            result?.message || response.statusText
          );
          throw new Error(
            result?.message || "Có lỗi xảy ra khi lấy danh sách học sinh"
          );
        }

        setStudents(result.data ?? []);
        console.log(
          "[fetchClassroomStudents] Lấy danh sách học sinh thành công:",
          result.data
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Có lỗi xảy ra";
        setError(msg);
        setStudents([]);
        console.error("[fetchClassroomStudents] Lỗi:", msg);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

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
    error,
    fetchClassroomStudents,
    getStatistics,
    searchStudents,
    filterStudents,
  };
}

