"use client";

import { useState, useCallback, useEffect } from "react";
import useSWR from "swr";
import { ModerationItem, ModerationQueueFilter } from "@/types/admin";
import { useToast } from "@/hooks/use-toast";

/**
 * Fetcher function cho SWR
 */
const fetcher = (url: string) => fetch(url).then((res) => res.json());

/**
 * Hook để quản lý moderation queue trong admin
 */
export function useAdminModeration(filter?: ModerationQueueFilter) {
  const { toast } = useToast();
  const [filters, setFilters] = useState<ModerationQueueFilter>(filter || {});

  // Build query string
  const queryParams = new URLSearchParams();
  if (filters.type) queryParams.set("type", filters.type);
  if (filters.orgId) queryParams.set("orgId", filters.orgId);
  if (filters.status) queryParams.set("status", filters.status);
  if ((filters as any).startDate) queryParams.set("startDate", (filters as any).startDate as string);
  if ((filters as any).endDate) queryParams.set("endDate", (filters as any).endDate as string);
  if (filters.limit) queryParams.set("limit", String(filters.limit));
  if (filters.cursor) queryParams.set("cursor", filters.cursor);

  const { data, error, isLoading, mutate } = useSWR<{
    ok: boolean;
    data?: { items: ModerationItem[]; nextCursor?: string | null; counts?: { pending: number; approved: number; rejected: number } };
    error?: string;
  }>(`/api/admin/moderation/queue?${queryParams.toString()}`, fetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 2000,
  });

  // Standardize error toast
  useEffect(() => {
    if (error) {
      try {
        toast({ title: "Lỗi tải danh sách kiểm duyệt", description: "Vui lòng kiểm tra phạm vi Trường/Đơn vị và thử lại.", variant: "destructive" });
      } catch {}
    }
  }, [error, toast]);

  // Approve item
  const approveItem = useCallback(
    async (itemId: string, type: "announcement" | "comment") => {
      try {
        const endpoint =
          type === "announcement"
            ? `/api/admin/moderation/announcements/${itemId}/approve`
            : `/api/admin/moderation/comments/${itemId}/approve`;

        const headers: Record<string, string> = {};
        if (filters.orgId) headers["x-org-id"] = String(filters.orgId);
        const response = await fetch(endpoint, { method: "POST", headers });
        const result = await response.json();

        if (!response.ok || !result.ok) {
          throw new Error(result.error || "Không thể duyệt nội dung");
        }

        toast({
          title: "Thành công",
          description: "Đã duyệt nội dung",
          variant: "success",
        });

        mutate();
        return result;
      } catch (error: any) {
        console.error("[useAdminModeration] Approve error:", error);
        toast({
          title: "Lỗi",
          description: error.message || "Không thể duyệt nội dung",
          variant: "destructive",
        });
        throw error;
      }
    },
    [toast, mutate]
  );

  // Reject item
  const rejectItem = useCallback(
    async (
      itemId: string,
      type: "announcement" | "comment",
      reason: string
    ) => {
      try {
        const endpoint =
          type === "announcement"
            ? `/api/admin/moderation/announcements/${itemId}/reject`
            : `/api/admin/moderation/comments/${itemId}/reject`;

        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (filters.orgId) headers["x-org-id"] = String(filters.orgId);
        const response = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify({ reason }),
        });

        const result = await response.json();

        if (!response.ok || !result.ok) {
          throw new Error(result.error || "Không thể từ chối nội dung");
        }

        toast({
          title: "Thành công",
          description: "Đã từ chối nội dung",
          variant: "success",
        });

        mutate();
        return result;
      } catch (error: any) {
        console.error("[useAdminModeration] Reject error:", error);
        toast({
          title: "Lỗi",
          description: error.message || "Không thể từ chối nội dung",
          variant: "destructive",
        });
        throw error;
      }
    },
    [toast, mutate]
  );

  // Update filter
  const updateFilter = useCallback(
    (newFilter: Partial<ModerationQueueFilter>) => {
      setFilters((prev) => ({ ...prev, ...newFilter }));
    },
    []
  );

  // Reset filters
  const resetFilters = useCallback(() => {
    setFilters(filter || {});
  }, [filter]);

  // Refresh data
  const refresh = useCallback(() => {
    mutate();
  }, [mutate]);

  // Handle error
  if (error) {
    console.error("[useAdminModeration] Error:", error);
  }

  return {
    items: data?.data?.items || [],
    nextCursor: data?.data?.nextCursor,
    counts: data?.data?.counts,
    isLoading,
    error,
    filters,
    setFilters: updateFilter,
    resetFilters,
    approveItem,
    rejectItem,
    refresh,
  };
}

