"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import AdminHeader from "@/components/admin/AdminHeader";
import AnimatedSection from "@/components/admin/AnimatedSection";
import DataTable from "@/components/admin/data-table/DataTable";
import OrganizationModal from "@/components/admin/modals/OrganizationModal";
import ConfirmDialog from "@/components/admin/modals/ConfirmDialog";
import { Button } from "@/components/ui/button";
import StatsCard from "@/components/admin/stats/StatsCard";
import { AdminOrganization, TableColumn } from "@/types/admin";
import { useAdminOrganizations } from "@/hooks/admin/use-admin-organizations";
import { useAdminOrgMutations } from "@/hooks/admin/use-admin-org-mutations";
import { formatDate } from "@/lib/admin/format-date";
import { Building2, Plus, Edit, Trash2, Users } from "lucide-react";
import Link from "next/link";

/**
 * Component AdminOrgPage - Trang quản lý organizations
 */
export default function AdminOrgPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as string | undefined;

  // Hooks
  const {
    organizations,
    total,
    isLoading,
    search,
    setSearch,
    refresh,
  } = useAdminOrganizations({ limit: 50 });

  const {
    loading: mutating,
    createOrganization,
    updateOrganization,
    deleteOrganization,
  } = useAdminOrgMutations();

  // State
  const [selectedOrg, setSelectedOrg] = useState<AdminOrganization | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState<AdminOrganization | null>(null);

  // Table columns
  const columns: TableColumn<AdminOrganization>[] = [
    {
      key: "name",
      label: "Tên tổ chức",
      sortable: true,
    },
    {
      key: "slug",
      label: "Slug",
      sortable: true,
      render: (value) => (
        <span className="font-mono text-xs text-gray-500">
          {String(value ?? "-")}
        </span>
      ),
    },
    {
      key: "status",
      label: "Trạng thái",
      sortable: true,
      render: (value) => {
        const status = value as string;
        return (
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              status === "ACTIVE"
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {status === "ACTIVE" ? "Hoạt động" : "Không hoạt động"}
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

  // Handle create organization
  const handleCreateOrg = useCallback(
    async (data: any) => {
      try {
        await createOrganization(data);
        setIsCreateModalOpen(false);
        refresh();
      } catch (error) {
        // Error handled in hook
      }
    },
    [createOrganization, refresh]
  );

  // Handle update organization
  const handleUpdateOrg = useCallback(
    async (data: any) => {
      try {
        await updateOrganization(data);
        setIsEditModalOpen(false);
        setSelectedOrg(null);
        refresh();
      } catch (error) {
        // Error handled in hook
      }
    },
    [updateOrganization, refresh]
  );

  // Handle delete organization
  const handleDeleteOrg = useCallback(async () => {
    if (!orgToDelete) return;

    try {
      await deleteOrganization(orgToDelete.id);
      setIsDeleteDialogOpen(false);
      setOrgToDelete(null);
      refresh();
    } catch (error) {
      // Error handled in hook
    }
  }, [orgToDelete, deleteOrganization, refresh]);

  // Render actions
  const renderActions = (org: AdminOrganization) => {
    return (
      <div className="flex items-center gap-2">
        <Link href={`/dashboard/admin/org/members?orgId=${org.id}`}>
          <Button
            variant="ghost"
            size="default"
            className="h-8 w-8 p-0"
            title="Xem thành viên tổ chức"
          >
            <Users className="h-4 w-4" />
          </Button>
        </Link>
        <Button
          variant="ghost"
          size="default"
          onClick={() => {
            setSelectedOrg(org);
            setIsEditModalOpen(true);
          }}
          className="h-8 w-8 p-0"
          title="Sửa"
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="default"
          onClick={() => {
            setOrgToDelete(org);
            setIsDeleteDialogOpen(true);
          }}
          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
          title="Xóa"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  return (
    <AnimatedSection className="space-y-6">
      <AdminHeader userRole={role || ""} title="Quản lý tổ chức" />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard
          title="Tổng số tổ chức"
          value={total || 0}
          icon={<Building2 className="h-5 w-5" />}
          color="primary"
        />
      </div>

      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Danh sách tổ chức
          </h2>
          <p className="text-sm text-gray-500">
            Quản lý các tổ chức trong hệ thống
          </p>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Tạo tổ chức mới
        </Button>
      </div>

      {/* Data Table */}
      <DataTable<AdminOrganization>
        data={organizations}
        columns={columns}
        searchable
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Tìm kiếm theo tên tổ chức..."
        currentPage={1}
        onPageChange={() => {}}
        pageSize={50}
        total={total}
        loading={isLoading}
        actions={renderActions}
        getRowId={(row) => row.id}
        exportable
        exportFilename="organizations-export.csv"
        exportHeaders={{
          name: "Tên tổ chức",
          slug: "Slug",
          status: "Trạng thái",
          createdAt: "Ngày tạo",
        }}
      />

      {/* Create Organization Modal */}
      <OrganizationModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSubmit={handleCreateOrg}
        loading={mutating}
      />

      {/* Edit Organization Modal */}
      {selectedOrg && (
        <OrganizationModal
          open={isEditModalOpen}
          onOpenChange={(open) => {
            setIsEditModalOpen(open);
            if (!open) setSelectedOrg(null);
          }}
          onSubmit={handleUpdateOrg}
          initialData={{
            id: selectedOrg.id,
            name: selectedOrg.name,
            slug: selectedOrg.slug ?? undefined,
            status: selectedOrg.status,
          }}
          loading={mutating}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteOrg}
        title="Xóa tổ chức"
        description={
          orgToDelete
            ? `Bạn có chắc chắn muốn xóa tổ chức "${orgToDelete.name}"? Hành động này không thể hoàn tác.`
            : ""
        }
        variant="danger"
        confirmText="Xóa"
        cancelText="Hủy"
        loading={mutating}
      />
    </AnimatedSection>
  );
}
