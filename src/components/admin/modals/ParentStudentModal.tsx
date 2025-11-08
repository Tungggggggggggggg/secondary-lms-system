"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ParentStudentForm from "@/components/admin/forms/ParentStudentForm";
import { CreateParentStudentInput, UpdateParentStudentInput, ParentStudent } from "@/types/admin";

/**
 * Props cho ParentStudentModal component
 */
interface ParentStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateParentStudentInput | UpdateParentStudentInput) => Promise<void>;
  initialData?: ParentStudent;
  loading?: boolean;
}

/**
 * Component ParentStudentModal - Modal để tạo/sửa liên kết phụ huynh-học sinh
 * Sử dụng ParentStudentForm component
 */
export default function ParentStudentModal({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  loading = false,
}: ParentStudentModalProps) {
  const isEdit = !!initialData;

  const handleSubmit = async (data: CreateParentStudentInput | UpdateParentStudentInput) => {
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
          <DialogTitle>
            {isEdit ? "Sửa liên kết phụ huynh-học sinh" : "Thêm liên kết phụ huynh-học sinh"}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <ParentStudentForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            initialData={initialData}
            loading={loading}
            isEdit={isEdit}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

