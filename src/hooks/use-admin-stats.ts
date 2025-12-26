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

export function useAdminStats() {
  const { data, error, isLoading, mutate } = useSWR<{ success: true; data: AdminStats }>(
    "/api/admin/stats",
    { revalidateOnFocus: true, revalidateOnReconnect: true, refreshInterval: 60000 }
  );

  return {
    stats: data?.data ?? null,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    isLoading,
    mutate,
  };
}
