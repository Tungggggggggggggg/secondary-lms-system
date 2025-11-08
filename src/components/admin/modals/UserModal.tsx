"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import UserForm from "@/components/admin/forms/UserForm";
import { CreateUserInput, UpdateUserInput } from "@/types/admin";

/**
 * Props cho UserModal component
 */
interface UserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateUserInput | UpdateUserInput) => Promise<void>;
  initialData?: UpdateUserInput;
  loading?: boolean;
}

/**
 * Component UserModal - Modal để tạo/sửa user
 * Sử dụng UserForm component
 */
export default function UserModal({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  loading = false,
}: UserModalProps) {
  const isEdit = !!initialData;

  const handleSubmit = async (data: CreateUserInput | UpdateUserInput) => {
    await onSubmit(data);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Sửa người dùng" : "Tạo người dùng mới"}</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <UserForm
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

