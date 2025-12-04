"use client";

import ConfirmDialogAdmin from "@/components/admin/modals/ConfirmDialog";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  variant?: "default" | "danger" | "warning" | "info" | "success";
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
}

export default function ConfirmDialog(props: ConfirmDialogProps) {
  return <ConfirmDialogAdmin {...props} />;
}
