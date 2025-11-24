"use client";

import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { CreateUserInput, UpdateUserInput } from "@/types/admin";

/**
 * Hook để quản lý mutations cho users (create, update, delete)
 */
export function useAdminUserMutations() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Create user
  const createUser = useCallback(
    async (data: CreateUserInput) => {
      setLoading(true);
      try {
        const response = await fetch("/api/admin/system/users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Không thể tạo người dùng");
        }

        toast({
          title: "Thành công",
          description: "Đã tạo người dùng mới",
          variant: "success",
        });

        return result.data;
      } catch (error: any) {
        console.error("[useAdminUserMutations] Create user error:", error);
        toast({
          title: "Lỗi",
          description: error.message || "Không thể tạo người dùng",
          variant: "destructive",
        });
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  // Toggle 2FA (placeholder)
  const toggleTwoFA = useCallback(
    async (userId: string, enabled: boolean) => {
      setLoading(true);
      try {
        const response = await fetch(`/api/admin/system/users/${userId}/2fa`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled }),
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || "Không thể cập nhật 2FA");
        }
        toast({ title: "Thành công", description: enabled ? "Đã bật 2FA" : "Đã tắt 2FA", variant: "success" });
        return result;
      } catch (error: any) {
        console.error("[useAdminUserMutations] Toggle 2FA error:", error);
        toast({ title: "Lỗi", description: error.message || "Không thể cập nhật 2FA", variant: "destructive" });
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  // Toggle disable user (SUPER_ADMIN only)
  const toggleDisabled = useCallback(
    async (userId: string, disabled: boolean) => {
      setLoading(true);
      try {
        const response = await fetch(`/api/admin/system/users/${userId}/disable`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ disabled }),
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || "Không thể cập nhật trạng thái khoá/mở");
        }
        toast({ title: "Thành công", description: disabled ? "Đã khoá tài khoản" : "Đã mở khoá tài khoản", variant: "success" });
        return result;
      } catch (error: any) {
        console.error("[useAdminUserMutations] Toggle disabled error:", error);
        toast({ title: "Lỗi", description: error.message || "Không thể cập nhật trạng thái", variant: "destructive" });
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  // Update user
  const updateUser = useCallback(
    async (data: UpdateUserInput) => {
      setLoading(true);
      try {
        const response = await fetch(`/api/admin/system/users/${data.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Không thể cập nhật người dùng");
        }

        toast({
          title: "Thành công",
          description: "Đã cập nhật người dùng",
          variant: "success",
        });

        return result.data;
      } catch (error: any) {
        console.error("[useAdminUserMutations] Update user error:", error);
        toast({
          title: "Lỗi",
          description: error.message || "Không thể cập nhật người dùng",
          variant: "destructive",
        });
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  // Update user role
  const updateUserRole = useCallback(
    async (userId: string, role: string) => {
      setLoading(true);
      try {
        const response = await fetch(`/api/admin/system/users/${userId}/role`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ role }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Không thể cập nhật vai trò");
        }

        toast({
          title: "Thành công",
          description: "Đã cập nhật vai trò",
          variant: "success",
        });

        return result.user;
      } catch (error: any) {
        console.error("[useAdminUserMutations] Update role error:", error);
        toast({
          title: "Lỗi",
          description: error.message || "Không thể cập nhật vai trò",
          variant: "destructive",
        });
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  // Reset password
  const resetPassword = useCallback(
    async (userId: string, newPassword: string) => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/admin/system/users/${userId}/password`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ newPassword }),
          }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Không thể đặt lại mật khẩu");
        }

        toast({
          title: "Thành công",
          description: "Đã đặt lại mật khẩu",
          variant: "success",
        });

        return result;
      } catch (error: any) {
        console.error("[useAdminUserMutations] Reset password error:", error);
        toast({
          title: "Lỗi",
          description: error.message || "Không thể đặt lại mật khẩu",
          variant: "destructive",
        });
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  // Delete user
  const deleteUser = useCallback(
    async (userId: string) => {
      setLoading(true);
      try {
        const response = await fetch(`/api/admin/system/users/${userId}`, {
          method: "DELETE",
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Không thể xóa người dùng");
        }

        toast({
          title: "Thành công",
          description: "Đã xóa người dùng",
          variant: "success",
        });

        return result;
      } catch (error: any) {
        console.error("[useAdminUserMutations] Delete user error:", error);
        toast({
          title: "Lỗi",
          description: error.message || "Không thể xóa người dùng",
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
    createUser,
    updateUser,
    updateUserRole,
    resetPassword,
    deleteUser,
    toggleDisabled,
    toggleTwoFA,
  };
}

