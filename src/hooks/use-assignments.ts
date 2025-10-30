import { useCallback, useEffect, useState } from "react";

// Kiểu dữ liệu Assignment (tạm thời - nên đồng bộ lại với type backend)
export interface AssignmentT {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    submissions?: number;
    questions?: number;
  };
  // ...nếu cần các field phụ khác
}

interface UseAssignmentsState {
  assignments: AssignmentT[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useAssignments(): UseAssignmentsState {
  const [assignments, setAssignments] = useState<AssignmentT[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadFlag, setReloadFlag] = useState(0);

  // Hàm fetch bài tập
  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('[useAssignments] Đang lấy danh sách bài tập...');
      const res = await fetch('/api/assignments');
      const result = await res.json();
      if (!result.success) {
        console.error('[useAssignments] API trả về lỗi:', result.message);
        setError(result.message || 'Lỗi khi lấy dữ liệu bài tập');
        setAssignments([]);
        return;
      }
      console.log('[useAssignments] Lấy danh sách bài tập thành công:', result.data);
      setAssignments(result.data as AssignmentT[]);
    } catch (err: unknown) {
      let message = 'Lỗi không xác định';
      if (err instanceof Error) message = err.message;
      else if (typeof err === 'string') message = err;
      console.error('[useAssignments] Lỗi trong quá trình fetch:', err);
      setError(message);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => setReloadFlag((f) => f + 1), []);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments, reloadFlag]);

  return { assignments, loading, error, refresh };
}
