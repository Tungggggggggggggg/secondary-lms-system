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

export interface GradePageInfo {
  nextCursor: string | null;
  hasMore: boolean;
  limit: number | null;
}

/**
 * Hook quản lý grades cho parent (xem điểm của con)
 */
export function useParentGrades() {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [grades, setGrades] = useState<GradeEntry[]>([]);
  const [statistics, setStatistics] = useState<GradeStatistics>({
    averageGrade: 0,
  });

  const [pageInfo, setPageInfo] = useState<GradePageInfo>({
    nextCursor: null,
    hasMore: false,
    limit: null,
  });

  const lastParamsRef = useRef<{ childId: string; windowDays?: number; limit: number } | null>(null);

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
  const fetchChildGrades = useCallback(async (childId: string, windowDays?: number): Promise<void> => {
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
        setIsLoadingMore(false);
        setError(null);
      }

      const DEFAULT_LIMIT = 50;
      lastParamsRef.current = { childId, windowDays, limit: DEFAULT_LIMIT };

      const params = new URLSearchParams();
      if (typeof windowDays === "number" && Number.isFinite(windowDays) && windowDays > 0) {
        params.set("windowDays", String(windowDays));
      }
      params.set("limit", String(DEFAULT_LIMIT));
      const qs = params.toString();
      const url = qs
        ? `/api/parent/children/${childId}/grades?${qs}`
        : `/api/parent/children/${childId}/grades`;

      const response = await fetch(url, {
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
      setPageInfo(result.pageInfo ?? { nextCursor: null, hasMore: false, limit: DEFAULT_LIMIT });
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

  const loadMore = useCallback(async (): Promise<void> => {
    const last = lastParamsRef.current;
    if (!last) return;
    if (!pageInfo?.hasMore || !pageInfo.nextCursor) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    let didTimeout = false;
    const REQUEST_TIMEOUT_MS = 20_000;
    const timeoutId = setTimeout(() => {
      didTimeout = true;
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    try {
      if (mountedRef.current) {
        setIsLoadingMore(true);
        setError(null);
      }

      const params = new URLSearchParams();
      if (typeof last.windowDays === "number" && Number.isFinite(last.windowDays) && last.windowDays > 0) {
        params.set("windowDays", String(last.windowDays));
      }
      params.set("limit", String(last.limit));
      params.set("cursor", pageInfo.nextCursor);

      const res = await fetch(`/api/parent/children/${last.childId}/grades?${params.toString()}`, {
        signal: controller.signal,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.message || "Có lỗi xảy ra khi tải thêm điểm số");
      }

      if (!mountedRef.current) return;

      const nextItems: GradeEntry[] = Array.isArray(json?.data) ? json.data : [];
      setGrades((prev) => {
        if (!nextItems.length) return prev;
        const seen = new Set(prev.map((i) => i.id));
        const merged = [...prev];
        for (const it of nextItems) {
          if (!seen.has(it.id)) merged.push(it);
        }
        return merged;
      });
      setStatistics(json.statistics ?? statistics);
      setPageInfo(json.pageInfo ?? pageInfo);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        if (!didTimeout) return;
        const msg = "Tải thêm điểm số quá lâu. Vui lòng thử lại.";
        if (!mountedRef.current) return;
        setError(msg);
        return;
      }
      const msg = err instanceof Error ? err.message : "Có lỗi xảy ra";
      if (!mountedRef.current) return;
      setError(msg);
    } finally {
      clearTimeout(timeoutId);
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      if (mountedRef.current) {
        setIsLoadingMore(false);
      }
    }
  }, [pageInfo, statistics]);

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
    isLoadingMore,
    error,
    fetchChildGrades,
    loadMore,
    hasMore: !!pageInfo?.hasMore,
    fetchChildClassroomGrades,
  };
}

