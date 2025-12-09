"use client";

import { useCallback, useMemo, useState } from "react";

export type SelectionSet<T extends string> = Set<T>;

export interface UseSelectionOptions<T extends string> {
  initial?: T[];
}

export function useSelection<T extends string>(options?: UseSelectionOptions<T>) {
  const [set, setSet] = useState<SelectionSet<T>>(
    () => new Set((options?.initial ?? []) as T[])
  );

  const has = useCallback((id: T) => set.has(id), [set]);

  const toggle = useCallback((id: T) => {
    setSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clear = useCallback(() => setSet(new Set()), []);

  const selectAll = useCallback((ids: readonly T[]) => {
    setSet(new Set(ids as T[]));
  }, []);

  const value = useMemo(() => set, [set]);

  return { value, has, toggle, clear, selectAll, size: set.size } as const;
}
