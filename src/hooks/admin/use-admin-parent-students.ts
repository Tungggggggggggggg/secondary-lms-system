"use client";

import { useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import { ParentStudent, PaginatedResponse, ParentStudentFilter } from "@/types/admin";
import { useToast } from "@/hooks/use-toast";

/**
 * Fetcher function cho SWR
 */
const fetcher = (url: string) => fetch(url).then((res) => res.json());

/**
 * Hook để quản lý danh sách parent-student relationships trong admin
 * Hỗ trợ pagination, search, và filtering
 */
export function useAdminParentStudents(params?: ParentStudentFilter) {
  const { toast } = useToast();
  const [search, setSearch] = useState(params?.search || "");
  const [parentId, setParentId] = useState(params?.parentId || "");
  const [studentId, setStudentId] = useState(params?.studentId || "");
  const [page, setPage] = useState(params?.page || 1);
  const [limit] = useState(params?.limit || 20);

  // Reset page to 1 when search changes
  useEffect(() => {
    if (search && page > 1) {
      setPage(1);
    }
  }, [search]);

  // Build query string
  const queryParams = new URLSearchParams();
  queryParams.set("take", String(limit));
  queryParams.set("page", String(page));
  if (search) queryParams.set("search", search);
  if (parentId) queryParams.set("parentId", parentId);
  if (studentId) queryParams.set("studentId", studentId);

  const { data, error, isLoading, mutate } = useSWR<{
    success?: boolean;
    items?: ParentStudent[];
    total?: number;
    error?: string;
  }>(`/api/admin/parent-students?${queryParams.toString()}`, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  // Handle error
  useEffect(() => {
    if (error) {
      console.error("[useAdminParentStudents] Error:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách liên kết phụ huynh-học sinh",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  // Refresh data
  const refresh = useCallback(() => {
    mutate();
  }, [mutate]);

  // Set filters
  const setFilters = useCallback((filters: Partial<ParentStudentFilter>) => {
    if (filters.search !== undefined) setSearch(filters.search || "");
    if (filters.parentId !== undefined) setParentId(filters.parentId || "");
    if (filters.studentId !== undefined) setStudentId(filters.studentId || "");
  }, []);

  // Reset filters
  const resetFilters = useCallback(() => {
    setSearch("");
    setParentId("");
    setStudentId("");
    setPage(1);
  }, []);

  const relationships = data?.items || [];
  const total = data?.total || 0;

  return {
    relationships,
    total,
    isLoading,
    error,
    search,
    setSearch,
    parentId,
    setParentId,
    studentId,
    setStudentId,
    page,
    setPage,
    limit,
    refresh,
    setFilters,
    resetFilters,
  };
}

