import { useEffect, useMemo, useRef, useState } from "react";
import type { AssignmentT } from "@/hooks/use-assignments";

export type AssignmentStatusFilter = "all" | "active" | "completed" | "draft" | "needGrading";
export type SortKey = "createdAt" | "dueDate" | "lockAt" | "title";
export type SortDir = "asc" | "desc";

export interface UseAssignmentsQueryParams {
  search?: string;
  status?: AssignmentStatusFilter;
  classId?: string;
  page?: number;
  pageSize?: number;
  sortKey?: SortKey;
  sortDir?: SortDir;
}

export interface UseAssignmentsQueryResult {
  items: AssignmentT[];
  total: number;
  loading: boolean;
  error: string | null;
  page: number;
  pageSize: number;
  setPage: (n: number) => void;
  refresh: () => void;
  counts: { all: number; active: number; completed: number; needGrading: number } | null;
}

export function useAssignmentsQuery(params: UseAssignmentsQueryParams): UseAssignmentsQueryResult {
  const [items, setItems] = useState<AssignmentT[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(params.page ?? 1);
  const pageSize = params.pageSize ?? 10;
  const [reloadTick, setReloadTick] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);
  const [counts, setCounts] = useState<{ all: number; active: number; completed: number; needGrading: number } | null>(null);

  const query = useMemo(() => {
    const q = new URLSearchParams();
    if (params.search) q.set("q", params.search);
    if (params.status && params.status !== "all") q.set("status", params.status);
    if (params.classId && params.classId !== "all") q.set("classId", params.classId);
    q.set("take", String(pageSize));
    q.set("skip", String((page - 1) * pageSize));
    if (params.sortKey) q.set("sortKey", params.sortKey);
    if (params.sortDir) q.set("sortDir", params.sortDir);
    return q.toString();
  }, [params.search, params.status, params.classId, page, pageSize, params.sortKey, params.sortDir]);

  useEffect(() => {
    // debounce on search
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      (async () => {
        try {
          setLoading(true);
          setError(null);
          abortRef.current?.abort();
          const ac = new AbortController();
          abortRef.current = ac;
          const res = await fetch(`/api/teachers/assignments?${query}`, { signal: ac.signal, cache: "no-store" });
          const json = await res.json().catch(() => ({}));
          if (!res.ok || json?.success === false) {
            throw new Error(json?.message || res.statusText || "Fetch error");
          }
          setItems(json.data?.items ?? []);
          setTotal(json.data?.total ?? 0);
          if (json.data?.counts) {
            const c = json.data.counts;
            setCounts({
              all: Number(c.all ?? 0),
              active: Number(c.active ?? 0),
              completed: Number(c.completed ?? 0),
              needGrading: Number(c.needGrading ?? 0),
            });
          } else {
            setCounts(null);
          }
        } catch (e: any) {
          if (e?.name === "AbortError") return;
          setError(e?.message || "Lỗi tải dữ liệu");
          setItems([]);
          setTotal(0);
          setCounts(null);
        } finally {
          setLoading(false);
        }
      })();
    }, params.search ? 300 : 0);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, [query, reloadTick]);

  const refresh = () => setReloadTick((v) => v + 1);

  return { items, total, loading, error, page, pageSize, setPage, refresh, counts };
}
