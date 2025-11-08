"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import { AdminOrganization, PaginatedResponse, PaginationParams } from "@/types/admin";
import { useToast } from "@/hooks/use-toast";

/**
 * Fetcher function cho SWR
 */
const fetcher = (url: string) => fetch(url).then((res) => res.json());

/**
 * Hook để quản lý danh sách organizations trong admin
 */
export function useAdminOrganizations(params?: PaginationParams) {
  const { toast } = useToast();
  const [search, setSearch] = useState(params?.search || "");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(params?.limit || 20);

  // Build query string
  const queryParams = new URLSearchParams();
  if (limit) queryParams.set("limit", String(limit));
  if (search) queryParams.set("search", search);

  const { data, error, isLoading, mutate } = useSWR<{
    ok?: boolean;
    success?: boolean;
    data?: PaginatedResponse<AdminOrganization>;
    items?: AdminOrganization[];
    total?: number;
    error?: string;
  }>(`/api/admin/org?${queryParams.toString()}`, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  // Handle error
  if (error) {
    console.error("[useAdminOrganizations] Error:", error);
  }

  // Hỗ trợ cả hai format API response
  const organizations = data?.data?.items || data?.items || [];
  const total = data?.data?.total || data?.total;

  // Refresh data
  const refresh = useCallback(() => {
    mutate();
  }, [mutate]);

  return {
    organizations,
    total,
    nextCursor: data?.data?.nextCursor,
    isLoading,
    error,
    search,
    setSearch,
    page,
    setPage,
    limit,
    setLimit,
    refresh,
  };
}

