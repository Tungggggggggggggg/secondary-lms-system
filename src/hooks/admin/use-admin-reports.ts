"use client";

import useSWR from "swr";
import { ReportsOverview, ReportsUsage, ReportsGrowth, ReportsFilter } from "@/types/admin";
import { useToast } from "@/hooks/use-toast";

/**
 * Fetcher function cho SWR
 */
const fetcher = (url: string) => fetch(url).then((res) => res.json());

/**
 * Hook để quản lý reports data trong admin
 */
export function useAdminReports(filter?: ReportsFilter) {
  const { toast } = useToast();

  // Build query string
  const queryParams = new URLSearchParams();
  if (filter?.orgId) queryParams.set("orgId", filter.orgId);
  if (filter?.startDate) queryParams.set("startDate", filter.startDate);
  if (filter?.endDate) queryParams.set("endDate", filter.endDate);

  const queryString = queryParams.toString();

  // Fetch overview
  const {
    data: overviewData,
    error: overviewError,
    isLoading: overviewLoading,
    mutate: mutateOverview,
  } = useSWR<{
    ok: boolean;
    data?: ReportsOverview;
    error?: string;
  }>(`/api/admin/reports/overview${queryString ? `?${queryString}` : ""}`, fetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 2000,
  });

  // Fetch usage
  const {
    data: usageData,
    error: usageError,
    isLoading: usageLoading,
    mutate: mutateUsage,
  } = useSWR<{
    ok: boolean;
    data?: ReportsUsage;
    error?: string;
  }>(`/api/admin/reports/usage${queryString ? `?${queryString}` : ""}`, fetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 2000,
  });

  // Fetch growth
  const {
    data: growthData,
    error: growthError,
    isLoading: growthLoading,
    mutate: mutateGrowth,
  } = useSWR<{
    ok: boolean;
    data?: ReportsGrowth[];
    error?: string;
  }>(`/api/admin/reports/growth${queryString ? `?${queryString}` : ""}`, fetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 2000,
  });

  // Handle errors
  const error = overviewError || usageError || growthError;
  if (error) {
    console.error("[useAdminReports] Error:", error);
    try {
      // best-effort toast
      toast({ title: "Lỗi tải dữ liệu báo cáo", description: "Vui lòng kiểm tra phạm vi Trường/Đơn vị và thử lại.", variant: "destructive" });
    } catch {}
  }
  const isLoading = overviewLoading || usageLoading || growthLoading;

  // Refresh all
  const refresh = () => {
    mutateOverview();
    mutateUsage();
    mutateGrowth();
  };

  return {
    overview: overviewData?.data,
    usage: usageData?.data,
    growth: growthData?.data || [],
    isLoading,
    error,
    refresh,
  };
}

