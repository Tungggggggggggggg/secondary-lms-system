"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import AdminHeader from "@/components/admin/AdminHeader";
import AnimatedSection from "@/components/admin/AnimatedSection";
import DataTable from "@/components/admin/data-table/DataTable";
import ParentStudentModal from "@/components/admin/modals/ParentStudentModal";
import ConfirmDialog from "@/components/admin/modals/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { ParentStudent, TableColumn, TableSort, CreateParentStudentInput, UpdateParentStudentInput } from "@/types/admin";
import { useAdminParentStudents } from "@/hooks/admin/use-admin-parent-students";
import { useAdminParentStudentMutations } from "@/hooks/admin/use-admin-parent-student-mutations";
import { formatDate } from "@/lib/admin/format-date";
import { Plus, Trash2, Edit } from "lucide-react";

/**
 * Component AdminParentStudentsPage - Trang quản lý liên kết phụ huynh-học sinh cho SUPER_ADMIN
 * Sử dụng DataTable, ParentStudentModal, và các hooks
 */
export default function AdminParentStudentsPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as string | undefined;

  // Hooks
  const {
    relationships,
    total,
    isLoading,
    search,
    setSearch,
    page,
    setPage,
    limit,
    refresh,
  } = useAdminParentStudents({ limit: 20 });

  const {
    loading: mutating,
    createParentStudent,
    updateParentStudent,
    deleteParentStudent,
  } = useAdminParentStudentMutations();

  // State
  const [sort, setSort] = useState<TableSort<ParentStudent> | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRelationship, setSelectedRelationship] = useState<ParentStudent | null>(null);
  const [relationshipToDelete, setRelationshipToDelete] = useState<ParentStudent | null>(null);

  // Table columns
  const columns: TableColumn<ParentStudent>[] = [
    {
      key: "parent",
      label: "Phụ huynh",
      sortable: false,
      render: (value, row) => (
        <div>
          <div className="font-medium">{row.parent.fullname}</div>
          <div className="text-sm text-gray-500">{row.parent.email}</div>
        </div>
      ),
    },
    {
      key: "student",
      label: "Học sinh",
      sortable: false,
      render: (value, row) => (
        <div>
          <div className="font-medium">{row.student.fullname}</div>
          <div className="text-sm text-gray-500">{row.student.email}</div>
        </div>
      ),
    },
    {
      key: "createdAt",
      label: "Ngày tạo",
      sortable: true,
      render: (value) => formatDate(value as string, "medium"),
    },
  ];

  // Handle create relationship
  const handleCreateRelationship = useCallback(
    async (data: CreateParentStudentInput | UpdateParentStudentInput) => {
      try {
        if ('id' in data) {
          await updateParentStudent(data as UpdateParentStudentInput);
          setIsEditModalOpen(false);
        } else {
          await createParentStudent(data as CreateParentStudentInput);
          setIsCreateModalOpen(false);
        }
        setSelectedRelationship(null);
        refresh();
      } catch (error) {
        // Error đã được xử lý trong hook
      }
    },
    [createParentStudent, updateParentStudent, refresh]
  );

  // Handle delete relationship
  const handleDeleteRelationship = useCallback(async () => {
    if (!relationshipToDelete) return;

    try {
      await deleteParentStudent(relationshipToDelete.id);
      setIsDeleteDialogOpen(false);
      setRelationshipToDelete(null);
      refresh();
    } catch (error) {
      // Error đã được xử lý trong hook
    }
  }, [relationshipToDelete, deleteParentStudent, refresh]);

  // Actions column render
  const renderActions = (relationship: ParentStudent) => {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSelectedRelationship(relationship);
            setIsEditModalOpen(true);
          }}
          className="h-8 w-8 p-0"
          title="Sửa liên kết"
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setRelationshipToDelete(relationship);
            setIsDeleteDialogOpen(true);
          }}
          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
          title="Xóa liên kết"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  return (
    <AnimatedSection className="space-y-6">
      <AdminHeader userRole={role || ""} title="Liên kết Phụ huynh-Học sinh" />

      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Danh sách liên kết phụ huynh-học sinh
          </h2>
          <p className="text-sm text-gray-500">
            Quản lý liên kết giữa phụ huynh và học sinh trong hệ thống
          </p>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Thêm liên kết
        </Button>
      </div>

      {/* Data Table */}
      <DataTable<ParentStudent>
        data={relationships}
        columns={columns}
        searchable
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Tìm kiếm theo tên phụ huynh, học sinh hoặc email..."
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
        exportFilename="parent-students-export.csv"
        exportHeaders={{
          parent: "Phụ huynh",
          student: "Học sinh",
          createdAt: "Ngày tạo",
        }}
        emptyMessage="Không có liên kết phụ huynh-học sinh nào"
      />

      {/* Create Relationship Modal */}
      <ParentStudentModal
        open={isCreateModalOpen}
        onOpenChange={(open) => {
          setIsCreateModalOpen(open);
          if (!open) setSelectedRelationship(null);
        }}
        onSubmit={handleCreateRelationship}
        loading={mutating}
      />

      {/* Edit Relationship Modal */}
      {selectedRelationship && (
        <ParentStudentModal
          open={isEditModalOpen}
          onOpenChange={(open) => {
            setIsEditModalOpen(open);
            if (!open) setSelectedRelationship(null);
          }}
          onSubmit={handleCreateRelationship}
          initialData={selectedRelationship}
          loading={mutating}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteRelationship}
        title="Xóa liên kết phụ huynh-học sinh"
        description={
          relationshipToDelete
            ? `Bạn có chắc chắn muốn xóa liên kết giữa "${relationshipToDelete.parent.fullname}" và "${relationshipToDelete.student.fullname}"? Hành động này không thể hoàn tác.`
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

