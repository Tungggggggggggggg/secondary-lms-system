import { useEffect, useMemo, useRef, useState } from "react";
import type { ClassroomResponse } from "@/types/classroom";

export type ClassroomStatusFilter = "all" | "active" | "archived";
export type ClassroomSortKey = "createdAt" | "name" | "students";
export type SortDir = "asc" | "desc";

export interface UseClassroomsQueryParams {
  search?: string;
  status?: ClassroomStatusFilter;
  page?: number;
  pageSize?: number;
  sortKey?: ClassroomSortKey;
  sortDir?: SortDir;
  enabled?: boolean;
}

export interface UseClassroomsQueryResult {
  items: (ClassroomResponse & { _count?: { students: number } })[];
  total: number;
  loading: boolean;
  error: string | null;
  page: number;
  pageSize: number;
  setPage: (n: number) => void;
  refresh: () => void;
  counts: { all: number; active: number; archived: number } | null;
}

export function useClassroomsQuery(params: UseClassroomsQueryParams): UseClassroomsQueryResult {
  const [items, setItems] = useState<(ClassroomResponse & { _count?: { students: number } })[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(params.page ?? 1);
  const pageSize = params.pageSize ?? 12;
  const [reloadTick, setReloadTick] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);
  const [counts, setCounts] = useState<{ all: number; active: number; archived: number } | null>(null);
  const enabled = params.enabled ?? false;

  const query = useMemo(() => {
    const q = new URLSearchParams();
    if (params.search) q.set("q", params.search);
    if (params.status && params.status !== "all") q.set("status", params.status);
    q.set("take", String(pageSize));
    q.set("skip", String((page - 1) * pageSize));
    if (params.sortKey) q.set("sortKey", params.sortKey);
    if (params.sortDir) q.set("sortDir", params.sortDir);
    return q.toString();
  }, [params.search, params.status, page, pageSize, params.sortKey, params.sortDir]);

  useEffect(() => {
    if (!enabled) {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      abortRef.current?.abort();
      setLoading(false);
      setError(null);
      setItems([]);
      setTotal(0);
      setCounts({ all: 0, active: 0, archived: 0 });
      return;
    }
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      (async () => {
        try {
          setLoading(true);
          setError(null);
          abortRef.current?.abort();
          const ac = new AbortController();
          abortRef.current = ac;
          const res = await fetch(`/api/teachers/classrooms/query?${query}`, { signal: ac.signal, cache: "no-store" });
          const json = await res.json().catch(() => ({}));
          if (res.status === 403) {
            console.warn('[useClassroomsQuery] Forbidden - Teacher only. Trả về danh sách rỗng.');
            setItems([]);
            setTotal(0);
            setCounts({ all: 0, active: 0, archived: 0 });
            setError(null);
            return;
          }
          if (!res.ok || json?.success === false) {
            throw new Error(json?.message || res.statusText || 'Fetch error');
          }
          setItems(json.data?.items ?? []);
          setTotal(json.data?.total ?? 0);
          if (json.data?.counts) {
            const c = json.data.counts;
            setCounts({
              all: Number(c.all ?? 0),
              active: Number(c.active ?? 0),
              archived: Number(c.archived ?? 0),
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
  }, [query, reloadTick, enabled]);

  const refresh = () => setReloadTick((v) => v + 1);

  return { items, total, loading, error, page, pageSize, setPage, refresh, counts };
}
