"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Info, CheckCircle, XCircle } from "lucide-react";

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

export default function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  variant = "default",
  confirmText = "Xác nhận",
  cancelText = "Hủy",
  loading = false,
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
  };

  const handleCancel = () => {
    if (!loading) {
      onOpenChange(false);
    }
  };

  const variantStyles = {
    default: { icon: Info, iconColor: "text-blue-600", iconBg: "bg-blue-100", confirmButton: "bg-violet-600 hover:bg-violet-700" },
    danger: { icon: XCircle, iconColor: "text-red-600", iconBg: "bg-red-100", confirmButton: "bg-red-600 hover:bg-red-700" },
    warning: { icon: AlertTriangle, iconColor: "text-amber-600", iconBg: "bg-amber-100", confirmButton: "bg-amber-600 hover:bg-amber-700" },
    info: { icon: Info, iconColor: "text-blue-600", iconBg: "bg-blue-100", confirmButton: "bg-blue-600 hover:bg-blue-700" },
    success: { icon: CheckCircle, iconColor: "text-green-600", iconBg: "bg-green-100", confirmButton: "bg-green-600 hover:bg-green-700" },
  } as const;

  const style = variantStyles[variant];
  const Icon = style.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" onClose={() => handleCancel()}>
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div className={`p-2 rounded-full ${style.iconBg}`}>
              <Icon className={`h-6 w-6 ${style.iconColor}`} />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg font-semibold text-gray-900">{title}</DialogTitle>
              {description && <p className="mt-2 text-sm text-gray-600">{description}</p>}
            </div>
          </div>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            {cancelText}
          </Button>
          <Button className={style.confirmButton} onClick={handleConfirm} disabled={loading}>
            {loading ? "Đang xử lý..." : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
