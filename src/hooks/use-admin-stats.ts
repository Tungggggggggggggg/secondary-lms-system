"use client";

import useSWR from "swr";

export type AdminStats = {
  totals: {
    users: number;
    classrooms: number;
    assignments: number;
    organizations: number;
    disabledUsers: number;
  };
  byRole: Record<string, number>;
};

const fetcher = async (url: string) => {
  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json().catch(() => ({ success: false }));
  if (!res.ok || json?.success === false) {
    const msg = json?.message || res.statusText || "Fetch error";
    throw new Error(msg);
  }
  return json as { success: true; data: AdminStats };
};

export function useAdminStats() {
  const { data, error, isLoading, mutate } = useSWR<{ success: true; data: AdminStats }>(
    "/api/admin/stats",
    fetcher,
    { revalidateOnFocus: true, revalidateOnReconnect: true, refreshInterval: 60000 }
  );

  return {
    stats: data?.data ?? null,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    isLoading,
    mutate,
  };
}
