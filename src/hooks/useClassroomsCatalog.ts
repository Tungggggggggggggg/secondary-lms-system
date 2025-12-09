"use client";

import { useEffect, useMemo, useState } from "react";

export type ClassroomInfo = { id: string; name: string; studentCount?: number };

export default function useClassroomsCatalog() {
  const [list, setList] = useState<ClassroomInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const resp = await fetch("/api/classrooms");
        const data = await resp.json().catch(() => ({}));
        const raw = (data?.data || []) as Array<{ id: string; name: string; _count?: { students?: number } }>; 
        if (!Array.isArray(raw)) {
          throw new Error("Invalid API response");
        }
        if (mounted) {
          setList(
            raw.map((c) => ({ id: c.id, name: c.name, studentCount: c._count?.students }))
          );
        }
      } catch (e) {
        if (mounted) setError((e as Error)?.message || "Unknown error");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const names = useMemo(() => {
    const m: Record<string, string> = {};
    for (const c of list) m[c.id] = c.name;
    return m;
  }, [list]);

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of list) if (typeof c.studentCount === "number") m[c.id] = c.studentCount!;
    return m;
  }, [list]);

  return { list, names, counts, loading, error } as const;
}
