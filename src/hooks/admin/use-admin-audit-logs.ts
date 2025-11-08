"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import { AuditLog, AuditLogFilter, PaginatedResponse } from "@/types/admin";
import { useToast } from "@/hooks/use-toast";

/**
 * Fetcher function cho SWR
 */
const fetcher = (url: string) => fetch(url).then((res) => res.json());

/**
 * Hook để quản lý audit logs trong admin
 * Hỗ trợ filtering và pagination
 */
export function useAdminAuditLogs(filter?: AuditLogFilter) {
  const { toast } = useToast();
  const [filters, setFilters] = useState<AuditLogFilter>(filter || {});

  // Build query string
  const queryParams = new URLSearchParams();
  if (filters.orgId) queryParams.set("orgId", filters.orgId);
  if (filters.actorId) queryParams.set("actorId", filters.actorId);
  if (filters.action) queryParams.set("action", filters.action);
  if (filters.entityType) queryParams.set("entityType", filters.entityType);
  if (filters.entityId) queryParams.set("entityId", filters.entityId);
  if (filters.startDate) queryParams.set("startDate", filters.startDate);
  if (filters.endDate) queryParams.set("endDate", filters.endDate);
  if (filters.limit) queryParams.set("limit", String(filters.limit));
  if (filters.cursor) queryParams.set("cursor", filters.cursor);

  const { data, error, isLoading, mutate } = useSWR<{
    ok: boolean;
    data?: PaginatedResponse<AuditLog>;
    error?: string;
  }>(`/api/admin/audit?${queryParams.toString()}`, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  // Update filter
  const updateFilter = useCallback((newFilter: Partial<AuditLogFilter>) => {
    setFilters((prev) => ({ ...prev, ...newFilter }));
  }, []);

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
    console.error("[useAdminAuditLogs] Error:", error);
  }

  return {
    logs: data?.data?.items || [],
    total: data?.data?.total,
    nextCursor: data?.data?.nextCursor,
    isLoading,
    error,
    filters,
    setFilters: updateFilter,
    resetFilters,
    refresh,
  };
}

