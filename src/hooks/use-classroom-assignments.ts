import { useState, useCallback } from "react";
import { AssignmentT } from "./use-assignments";

/**
 * Interface cho Assignment trong classroom
 */
export interface ClassroomAssignment extends AssignmentT {
  addedAt: string; // Thời gian được thêm vào lớp
}

/**
 * Hook quản lý assignments trong classroom
 */
export function useClassroomAssignments() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<ClassroomAssignment[]>([]);

  /**
   * Lấy danh sách assignments đã được thêm vào classroom
   */
  const fetchClassroomAssignments = useCallback(
    async (classroomId: string): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);
        console.log(
          `[fetchClassroomAssignments] Bắt đầu lấy danh sách bài tập cho classroom: ${classroomId}`
        );

        const response = await fetch(`/api/classrooms/${classroomId}/assignments`);
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
   * Thêm assignment vào classroom
   */
  const addAssignmentToClassroom = useCallback(
    async (
      classroomId: string,
      assignmentId: string
    ): Promise<ClassroomAssignment | null> => {
      try {
        setIsLoading(true);
        setError(null);
        console.log(
          `[addAssignmentToClassroom] Thêm assignment ${assignmentId} vào classroom ${classroomId}`
        );

        const response = await fetch(
          `/api/classrooms/${classroomId}/assignments`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ assignmentId }),
          }
        );

        const result = await response.json();

        if (!response.ok) {
          console.error(
            "[addAssignmentToClassroom] Lỗi response:",
            result.message
          );
          throw new Error(
            result.message || "Có lỗi xảy ra khi thêm bài tập vào lớp"
          );
        }

        // Refresh danh sách assignments
        await fetchClassroomAssignments(classroomId);

        console.log("[addAssignmentToClassroom] Thêm bài tập thành công");
        return result.data;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Có lỗi xảy ra";
        setError(msg);
        console.error("[addAssignmentToClassroom] Lỗi:", msg);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchClassroomAssignments]
  );

  /**
   * Xóa assignment khỏi classroom
   */
  const removeAssignmentFromClassroom = useCallback(
    async (
      classroomId: string,
      assignmentId: string
    ): Promise<boolean> => {
      try {
        setIsLoading(true);
        setError(null);
        console.log(
          `[removeAssignmentFromClassroom] Xóa assignment ${assignmentId} khỏi classroom ${classroomId}`
        );

        const response = await fetch(
          `/api/classrooms/${classroomId}/assignments?assignmentId=${assignmentId}`,
          {
            method: "DELETE",
          }
        );

        const result = await response.json();

        if (!response.ok) {
          console.error(
            "[removeAssignmentFromClassroom] Lỗi response:",
            result.message
          );
          throw new Error(
            result.message || "Có lỗi xảy ra khi xóa bài tập khỏi lớp"
          );
        }

        // Refresh danh sách assignments
        await fetchClassroomAssignments(classroomId);

        console.log("[removeAssignmentFromClassroom] Xóa bài tập thành công");
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Có lỗi xảy ra";
        setError(msg);
        console.error("[removeAssignmentFromClassroom] Lỗi:", msg);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchClassroomAssignments]
  );

  /**
   * Lấy danh sách assignments có thể thêm vào classroom (chưa được thêm vào)
   */
  const getAvailableAssignments = useCallback(
    async (classroomId: string): Promise<AssignmentT[]> => {
      try {
        setError(null);
        console.log(
          `[getAvailableAssignments] Lấy danh sách bài tập có thể thêm vào classroom: ${classroomId}`
        );

        const response = await fetch(
          `/api/assignments?availableForClassroom=true&classroomId=${classroomId}`
        );
        const result = await response.json();

        if (!response.ok) {
          console.error(
            "[getAvailableAssignments] Lỗi response:",
            result?.message || response.statusText
          );
          throw new Error(
            result?.message || "Có lỗi xảy ra khi lấy danh sách bài tập"
          );
        }

        console.log(
          "[getAvailableAssignments] Lấy danh sách bài tập thành công:",
          result.data
        );
        return result.data ?? [];
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Có lỗi xảy ra";
        setError(msg);
        console.error("[getAvailableAssignments] Lỗi:", msg);
        return [];
      }
    },
    []
  );

  return {
    assignments,
    isLoading,
    error,
    fetchClassroomAssignments,
    addAssignmentToClassroom,
    removeAssignmentFromClassroom,
    getAvailableAssignments,
  };
}
