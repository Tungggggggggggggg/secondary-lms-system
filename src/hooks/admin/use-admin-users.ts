"use client";

import { useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import { AdminUser, PaginatedResponse, PaginationParams } from "@/types/admin";
import { useToast } from "@/hooks/use-toast";

/**
 * Fetcher function cho SWR
 */
const fetcher = (url: string) => fetch(url).then((res) => res.json());

/**
 * Hook để quản lý danh sách users trong admin
 * Hỗ trợ pagination, search, và filtering
 */
export function useAdminUsers(params?: PaginationParams) {
  const { toast } = useToast();
  const [search, setSearch] = useState(params?.search || "");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(params?.limit || 20);
  const [cursor, setCursor] = useState<string | null>(params?.cursor || null);

  // Build query string
  const queryParams = new URLSearchParams();
  queryParams.set("take", String(limit));
  queryParams.set("page", String(page));
  if (search) queryParams.set("q", search);

  const { data, error, isLoading, mutate } = useSWR<{
    success?: boolean;
    ok?: boolean;
    items?: AdminUser[];
    data?: PaginatedResponse<AdminUser>;
    total?: number;
    error?: string;
  }>(`/api/admin/system/users?${queryParams.toString()}`, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  // Handle error
  useEffect(() => {
    if (error) {
      console.error("[useAdminUsers] Error:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách người dùng",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  // Load next page
  const loadNext = useCallback(() => {
    setPage((prev) => prev + 1);
  }, []);

  // Load previous page
  const loadPrevious = useCallback(() => {
    setPage((prev) => Math.max(1, prev - 1));
  }, []);

  // Refresh data
  const refresh = useCallback(() => {
    mutate();
  }, [mutate]);

  // Hỗ trợ cả hai format API response
  const users = data?.items || data?.data?.items || [];
  const total = data?.total || data?.data?.total;

  return {
    users,
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
    cursor,
    setCursor,
    loadNext,
    loadPrevious,
    refresh,
  };
}

