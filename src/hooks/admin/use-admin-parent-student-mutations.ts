"use client";

import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { CreateParentStudentInput, UpdateParentStudentInput } from "@/types/admin";

/**
 * Hook để quản lý mutations cho parent-student relationships (create, update, delete)
 */
export function useAdminParentStudentMutations() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Create parent-student relationship
  const createParentStudent = useCallback(
    async (data: CreateParentStudentInput) => {
      setLoading(true);
      try {
        const response = await fetch("/api/admin/parent-students", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Không thể tạo liên kết phụ huynh-học sinh");
        }

        toast({
          title: "Thành công",
          description: "Đã tạo liên kết phụ huynh-học sinh",
          variant: "default",
        });

        return result.data;
      } catch (error: any) {
        console.error("[useAdminParentStudentMutations] Create error:", error);
        toast({
          title: "Lỗi",
          description: error.message || "Không thể tạo liên kết phụ huynh-học sinh",
          variant: "destructive",
        });
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  // Update parent-student relationship
  const updateParentStudent = useCallback(
    async (data: UpdateParentStudentInput) => {
      setLoading(true);
      try {
        const response = await fetch(`/api/admin/parent-students/${data.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            parentId: data.parentId,
            studentId: data.studentId,
          }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Không thể cập nhật liên kết phụ huynh-học sinh");
        }

        toast({
          title: "Thành công",
          description: "Đã cập nhật liên kết phụ huynh-học sinh",
          variant: "default",
        });

        return result.data;
      } catch (error: any) {
        console.error("[useAdminParentStudentMutations] Update error:", error);
        toast({
          title: "Lỗi",
          description: error.message || "Không thể cập nhật liên kết phụ huynh-học sinh",
          variant: "destructive",
        });
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  // Delete parent-student relationship
  const deleteParentStudent = useCallback(
    async (id: string) => {
      setLoading(true);
      try {
        const response = await fetch(`/api/admin/parent-students/${id}`, {
          method: "DELETE",
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Không thể xóa liên kết phụ huynh-học sinh");
        }

        toast({
          title: "Thành công",
          description: "Đã xóa liên kết phụ huynh-học sinh",
          variant: "default",
        });

        return result;
      } catch (error: any) {
        console.error("[useAdminParentStudentMutations] Delete error:", error);
        toast({
          title: "Lỗi",
          description: error.message || "Không thể xóa liên kết phụ huynh-học sinh",
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
    createParentStudent,
    updateParentStudent,
    deleteParentStudent,
  };
}

