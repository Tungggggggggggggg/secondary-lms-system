"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import AdminHeader from "@/components/admin/AdminHeader";
import AnimatedSection from "@/components/admin/AnimatedSection";
import DataTable from "@/components/admin/data-table/DataTable";
import UserModal from "@/components/admin/modals/UserModal";
import ConfirmDialog from "@/components/admin/modals/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { AdminUser, TableColumn, TableSort } from "@/types/admin";
import { useAdminUsers } from "@/hooks/admin/use-admin-users";
import { useAdminUserMutations } from "@/hooks/admin/use-admin-user-mutations";
import { formatDate } from "@/lib/admin/format-date";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/admin/admin-constants";
import { Plus, Edit, Trash2, Key } from "lucide-react";
import { UserRole as PrismaUserRole } from "@prisma/client";

/**
 * Component AdminUsersPage - Trang quản lý users cho SUPER_ADMIN
 * Sử dụng DataTable, UserModal, và các hooks
 */
export default function AdminUsersPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as string | undefined;

  // Hooks
  const {
    users,
    total,
    isLoading,
    search,
    setSearch,
    page,
    setPage,
    limit,
    refresh,
  } = useAdminUsers({ limit: 20 });

  const {
    loading: mutating,
    createUser,
    updateUser,
    updateUserRole,
    resetPassword,
    deleteUser,
  } = useAdminUserMutations();

  // State
  const [sort, setSort] = useState<TableSort<AdminUser> | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);
  const [userToResetPassword, setUserToResetPassword] = useState<AdminUser | null>(null);

  // Table columns
  const columns: TableColumn<AdminUser>[] = [
    {
      key: "email",
      label: "Email",
      sortable: true,
    },
    {
      key: "fullname",
      label: "Họ tên",
      sortable: true,
    },
    {
      key: "role",
      label: "Vai trò",
      sortable: true,
      render: (value) => {
        const roleValue = value as PrismaUserRole;
        return (
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              ROLE_COLORS[roleValue] || "bg-gray-100 text-gray-700"
            }`}
          >
            {ROLE_LABELS[roleValue] || roleValue}
          </span>
        );
      },
    },
    {
      key: "createdAt",
      label: "Ngày tạo",
      sortable: true,
      render: (value) => formatDate(value as string, "medium"),
    },
  ];

  // Handle create user
  const handleCreateUser = useCallback(
    async (data: any) => {
      try {
        await createUser(data);
        setIsCreateModalOpen(false);
        refresh();
      } catch (error) {
        // Error đã được xử lý trong hook
      }
    },
    [createUser, refresh]
  );

  // Handle update user
  const handleUpdateUser = useCallback(
    async (data: any) => {
      try {
        await updateUser(data);
        setIsEditModalOpen(false);
        setSelectedUser(null);
        refresh();
      } catch (error) {
        // Error đã được xử lý trong hook
      }
    },
    [updateUser, refresh]
  );

  // Handle delete user
  const handleDeleteUser = useCallback(async () => {
    if (!userToDelete) return;

    try {
      await deleteUser(userToDelete.id);
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
      refresh();
    } catch (error) {
      // Error đã được xử lý trong hook
    }
  }, [userToDelete, deleteUser, refresh]);

  // Handle reset password
  const handleResetPassword = useCallback(async () => {
    if (!userToResetPassword) return;

    const newPassword = prompt("Nhập mật khẩu mới (tối thiểu 6 ký tự):");
    if (!newPassword || newPassword.length < 6) {
      alert("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }

    try {
      await resetPassword(userToResetPassword.id, newPassword);
      setIsResetPasswordDialogOpen(false);
      setUserToResetPassword(null);
    } catch (error) {
      // Error đã được xử lý trong hook
    }
  }, [userToResetPassword, resetPassword]);

  // Handle update role
  const handleUpdateRole = useCallback(
    async (userId: string, newRole: string) => {
      try {
        await updateUserRole(userId, newRole);
        refresh();
      } catch (error) {
        // Error đã được xử lý trong hook
      }
    },
    [updateUserRole, refresh]
  );

  // Actions column render
  const renderActions = (user: AdminUser) => {
    return (
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          onClick={() => {
            setSelectedUser(user);
            setIsEditModalOpen(true);
          }}
          className="px-2 py-1 text-xs"
          title="Chỉnh sửa"
        >
          Sửa
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setUserToResetPassword(user);
            setIsResetPasswordDialogOpen(true);
          }}
          className="px-2 py-1 text-xs"
          title="Đặt lại mật khẩu"
        >
          Reset
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setUserToDelete(user);
            setIsDeleteDialogOpen(true);
          }}
          className="px-2 py-1 text-xs text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
          title="Xóa người dùng"
        >
          Xóa
        </Button>
      </div>
    );
  };

  return (
    <AnimatedSection className="space-y-6">
      <AdminHeader userRole={role || ""} title="Quản lý người dùng" />

      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Danh sách người dùng
          </h2>
          <p className="text-sm text-gray-500">
            Quản lý người dùng trong hệ thống
          </p>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Tạo người dùng mới
        </Button>
      </div>

      {/* Data Table */}
      <DataTable<AdminUser>
        data={users}
        columns={columns}
        searchable
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Tìm kiếm theo email, họ tên..."
        sort={sort || undefined}
        onSortChange={setSort}
        currentPage={page}
        onPageChange={setPage}
        pageSize={limit}
        total={total}
        loading={isLoading}
        actions={renderActions}
        getRowId={(row) => row.id}
        exportable
        exportFilename="users-export.csv"
        exportHeaders={{
          email: "Email",
          fullname: "Họ tên",
          role: "Vai trò",
          createdAt: "Ngày tạo",
        }}
      />

      {/* Create User Modal */}
      <UserModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSubmit={handleCreateUser}
        loading={mutating}
      />

      {/* Edit User Modal */}
      {selectedUser && (
        <UserModal
          open={isEditModalOpen}
          onOpenChange={(open) => {
            setIsEditModalOpen(open);
            if (!open) setSelectedUser(null);
          }}
          onSubmit={handleUpdateUser}
          initialData={selectedUser}
          loading={mutating}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteUser}
        title="Xóa người dùng"
        description={
          userToDelete
            ? `Bạn có chắc chắn muốn xóa người dùng "${userToDelete.fullname}" (${userToDelete.email})? Hành động này không thể hoàn tác.`
            : ""
        }
        variant="danger"
        confirmText="Xóa"
        cancelText="Hủy"
        loading={mutating}
      />

      {/* Reset Password Dialog */}
      <ConfirmDialog
        open={isResetPasswordDialogOpen}
        onOpenChange={setIsResetPasswordDialogOpen}
        onConfirm={handleResetPassword}
        title="Đặt lại mật khẩu"
        description={
          userToResetPassword
            ? `Bạn có chắc chắn muốn đặt lại mật khẩu cho người dùng "${userToResetPassword.fullname}"?`
            : ""
        }
        variant="warning"
        confirmText="Đặt lại"
        cancelText="Hủy"
        loading={mutating}
      />
    </AnimatedSection>
  );
}
