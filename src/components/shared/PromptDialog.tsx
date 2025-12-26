"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface PromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  placeholder?: string;
  initialValue?: string;
  type?: "text" | "password" | "textarea";
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  errorText?: string | null;
  onChange?: (value: string) => void;
  onConfirm: () => void;
}

export default function PromptDialog({
  open,
  onOpenChange,
  title,
  description,
  placeholder,
  initialValue,
  type = "text",
  confirmText = "Xác nhận",
  cancelText = "Hủy",
  loading = false,
  errorText = null,
  onChange,
  onConfirm,
}: PromptDialogProps) {
  const [value, setValue] = useState(initialValue || "");

  useEffect(() => {
    if (open) setValue(initialValue || "");
  }, [open, initialValue]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[min(640px,calc(100vw-2rem))] max-w-none max-h-[75vh]"
        onClose={() => onOpenChange(false)}
      >
        <DialogHeader>
          <DialogTitle className="text-lg">{title}</DialogTitle>
          {description ? (
            <DialogDescription className="text-gray-600">{description}</DialogDescription>
          ) : (
            <DialogDescription className="sr-only">Hộp thoại nhập liệu.</DialogDescription>
          )}
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-2 space-y-2">
          {type === "textarea" ? (
            <Textarea
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                onChange?.(e.target.value);
              }}
              placeholder={placeholder}
              rows={4}
            />
          ) : (
            <Input
              type={type}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                onChange?.(e.target.value);
              }}
              placeholder={placeholder}
            />
          )}
          {errorText ? (
            <p className="text-sm text-red-600">{errorText}</p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {cancelText}
          </Button>
          <Button onClick={onConfirm} disabled={loading}>
            {loading ? "Đang xử lý..." : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
