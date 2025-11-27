"use client";

import { useState, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import AdminHeader from "@/components/admin/AdminHeader";
import AnimatedSection from "@/components/admin/AnimatedSection";
import DataTable from "@/components/admin/data-table/DataTable";
import UserModal from "@/components/admin/modals/UserModal";
import ConfirmDialog from "@/components/admin/modals/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AdminUser, TableColumn, TableSort } from "@/types/admin";
import { useAdminUsers } from "@/hooks/admin/use-admin-users";
import { useAdminUserMutations } from "@/hooks/admin/use-admin-user-mutations";
import { formatDate } from "@/lib/admin/format-date";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/admin/admin-constants";
import { Plus, Edit, Trash2, Key, Lock, Unlock } from "lucide-react";
import { usePrompt } from "@/components/providers/PromptProvider";
import { useRouter } from "next/navigation";

type AppUserRole = "SUPER_ADMIN" | "STAFF" | "TEACHER" | "STUDENT" | "PARENT";

/**
 * Component AdminUsersPage - Trang quản lý users cho SUPER_ADMIN
 * Sử dụng DataTable, UserModal, và các hooks
 */
export default function AdminUsersPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as string | undefined;
  const router = useRouter();

  // Guard: chỉ SUPER_ADMIN mới được truy cập trang này
  useEffect(() => {
    if (role && role !== "SUPER_ADMIN") {
      router.replace("/dashboard/admin/overview");
    }
  }, [role, router]);

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
    toggleDisabled,
    toggleTwoFA,
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
  const prompt = usePrompt();

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
        const roleValue = value as AppUserRole;
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
    {
      key: "disabled",
      label: "Trạng thái",
      sortable: false,
      render: (_, row) => (
        (row as AdminUser).disabled ? (
          <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700">Đã khoá</span>
        ) : (
          <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">Hoạt động</span>
        )
      ),
    },
    {
      key: "twofaEnabled",
      label: "2FA",
      sortable: false,
      render: (_, row) => (
        (row as AdminUser).twofaEnabled ? (
          <span className="px-2 py-1 rounded-full text-xs bg-violet-100 text-violet-700">Đã bật</span>
        ) : (
          <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">Tắt</span>
        )
      ),
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
    const newPassword = await prompt({
      title: "Đặt lại mật khẩu",
      description: `Nhập mật khẩu mới cho ${userToResetPassword.fullname || userToResetPassword.email}`,
      placeholder: "Mật khẩu mới tối thiểu 6 ký tự",
      type: "password",
      validate: (v) => (v && v.length >= 6 ? null : "Mật khẩu phải có ít nhất 6 ký tự"),
      confirmText: "Xác nhận",
      cancelText: "Hủy",
    });
    if (!newPassword) return;

    try {
      await resetPassword(userToResetPassword.id, newPassword);
      setIsResetPasswordDialogOpen(false);
      setUserToResetPassword(null);
    } catch (error) {
      // Error đã được xử lý trong hook
    }
  }, [userToResetPassword, resetPassword, prompt]);

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
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditUser, setAuditUser] = useState<AdminUser | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditItems, setAuditItems] = useState<Array<{ id: string; createdAt: string; action: string; actorId: string; entityType: string; entityId: string; }>>([]);

  useEffect(() => {
    const fetchAudit = async () => {
      if (!auditOpen || !auditUser) return;
      setAuditLoading(true);
      try {
        const [byActorRes, byEntityRes] = await Promise.all([
          fetch(`/api/admin/system/audit?actorId=${encodeURIComponent(auditUser.id)}&take=25`),
          fetch(`/api/admin/system/audit?entityType=USER&entityId=${encodeURIComponent(auditUser.id)}&take=25`),
        ]);
        const a = await byActorRes.json();
        const b = await byEntityRes.json();
        const listA = a?.items || [];
        const listB = b?.items || [];
        const merged = [...listA, ...listB];
        merged.sort((x:any, y:any) => new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime());
        // de-dup by id
        const seen = new Set<string>();
        const dedup = merged.filter((it:any) => { if (seen.has(it.id)) return false; seen.add(it.id); return true; });
        setAuditItems(dedup);
      } catch (e) {
        console.error("[AdminUsersPage] Load audit error", e);
        setAuditItems([]);
      } finally {
        setAuditLoading(false);
      }
    };
    fetchAudit();
  }, [auditOpen, auditUser]);

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
          onClick={async () => {
            await toggleDisabled(user.id, !user.disabled);
            refresh();
          }}
          className={`px-2 py-1 text-xs ${user.disabled ? "text-green-600 border-green-200 hover:bg-green-50" : "text-red-600 border-red-200 hover:bg-red-50"}`}
          title={user.disabled ? "Mở khoá tài khoản" : "Khoá tài khoản"}
        >
          {user.disabled ? (
            <span className="flex items-center gap-1"><Unlock className="h-3 w-3" />Mở khoá</span>
          ) : (
            <span className="flex items-center gap-1"><Lock className="h-3 w-3" />Khoá</span>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={async () => {
            await toggleTwoFA(user.id, !user.twofaEnabled);
            refresh();
          }}
          className={`px-2 py-1 text-xs ${user.twofaEnabled ? "text-gray-700" : "text-violet-700"}`}
          title={user.twofaEnabled ? "Tắt 2FA (placeholder)" : "Bật 2FA (placeholder)"}
        >
          <span className="flex items-center gap-1"><Key className="h-3 w-3" />{user.twofaEnabled ? "Tắt 2FA" : "Bật 2FA"}</span>
        </Button>
        <Button
          variant="outline"
          onClick={() => { setAuditUser(user); setAuditOpen(true); }}
          className="px-2 py-1 text-xs"
          title="Nhật ký người dùng"
        >
          Nhật ký
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
          disabled: "Bị khoá",
          twofaEnabled: "2FA",
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

      {/* Audit Dialog */}
      <Dialog open={auditOpen} onOpenChange={setAuditOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Nhật ký người dùng</DialogTitle>
            <DialogDescription>
              {auditUser ? `${auditUser.fullname || auditUser.email}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto">
            {auditLoading ? (
              <div className="text-sm text-gray-500 p-3">Đang tải...</div>
            ) : auditItems.length === 0 ? (
              <div className="text-sm text-gray-500 p-3">Chưa có nhật ký</div>
            ) : (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600">
                    <th className="py-2 pr-4">Thời gian</th>
                    <th className="py-2 pr-4">Hành động</th>
                    <th className="py-2 pr-4">Đối tượng</th>
                  </tr>
                </thead>
                <tbody>
                  {auditItems.map((it) => (
                    <tr key={it.id} className="border-t">
                      <td className="py-2 pr-4">{formatDate(it.createdAt, "medium")}</td>
                      <td className="py-2 pr-4">{it.action}</td>
                      <td className="py-2 pr-4">{it.entityType}#{it.entityId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AnimatedSection>
  );
}
