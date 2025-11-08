"use client";

import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { CreateOrganizationInput, UpdateOrganizationInput } from "@/types/admin";

/**
 * Hook để quản lý mutations cho organizations (create, update, delete)
 */
export function useAdminOrgMutations() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Create organization
  const createOrganization = useCallback(
    async (data: CreateOrganizationInput) => {
      setLoading(true);
      try {
        const response = await fetch("/api/admin/org", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!response.ok || (!result.ok && !result.success)) {
          throw new Error(result.error || "Không thể tạo tổ chức");
        }

        toast({
          title: "Thành công",
          description: "Đã tạo tổ chức mới",
          variant: "success",
        });

        return result.data || result;
      } catch (error: any) {
        console.error("[useAdminOrgMutations] Create organization error:", error);
        toast({
          title: "Lỗi",
          description: error.message || "Không thể tạo tổ chức",
          variant: "destructive",
        });
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  // Update organization
  const updateOrganization = useCallback(
    async (data: UpdateOrganizationInput) => {
      setLoading(true);
      try {
        const response = await fetch(`/api/admin/org/${data.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!response.ok || (!result.ok && !result.success)) {
          throw new Error(result.error || "Không thể cập nhật tổ chức");
        }

        toast({
          title: "Thành công",
          description: "Đã cập nhật tổ chức",
          variant: "success",
        });

        return result.data || result;
      } catch (error: any) {
        console.error("[useAdminOrgMutations] Update organization error:", error);
        toast({
          title: "Lỗi",
          description: error.message || "Không thể cập nhật tổ chức",
          variant: "destructive",
        });
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  // Delete organization
  const deleteOrganization = useCallback(
    async (orgId: string) => {
      setLoading(true);
      try {
        const response = await fetch(`/api/admin/org/${orgId}`, {
          method: "DELETE",
        });

        const result = await response.json();

        if (!response.ok || (!result.ok && !result.success)) {
          throw new Error(result.error || "Không thể xóa tổ chức");
        }

        toast({
          title: "Thành công",
          description: "Đã xóa tổ chức",
          variant: "success",
        });

        return result;
      } catch (error: any) {
        console.error("[useAdminOrgMutations] Delete organization error:", error);
        toast({
          title: "Lỗi",
          description: error.message || "Không thể xóa tổ chức",
          variant: "destructive",
        });
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  return {
    loading,
    createOrganization,
    updateOrganization,
    deleteOrganization,
  };
}

