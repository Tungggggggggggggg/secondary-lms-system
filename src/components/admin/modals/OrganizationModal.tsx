"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import OrganizationForm from "@/components/admin/forms/OrganizationForm";
import { CreateOrganizationInput, UpdateOrganizationInput } from "@/types/admin";

/**
 * Props cho OrganizationModal component
 */
interface OrganizationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateOrganizationInput | UpdateOrganizationInput) => Promise<void>;
  initialData?: UpdateOrganizationInput;
  loading?: boolean;
}

/**
 * Component OrganizationModal - Modal để tạo/sửa organization
 */
export default function OrganizationModal({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  loading = false,
}: OrganizationModalProps) {
  const isEdit = !!initialData;

  const handleSubmit = async (data: CreateOrganizationInput | UpdateOrganizationInput) => {
    await onSubmit(data);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" onClose={() => handleCancel()}>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Sửa tổ chức" : "Tạo tổ chức mới"}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <OrganizationForm
            initialData={initialData}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            loading={loading}
            isEdit={isEdit}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

