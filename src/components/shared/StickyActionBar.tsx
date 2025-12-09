"use client";

import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StickyActionBarProps {
  className?: string;
  left?: ReactNode;
  right?: ReactNode;
  onCancel?: () => void;
  onSave?: () => void;
  cancelText?: string;
  saveText?: string;
  saving?: boolean;
  canSave?: boolean;
}

export default function StickyActionBar({
  className,
  left,
  right,
  onCancel,
  onSave,
  cancelText = "← Quay lại",
  saveText = "Tiếp tục →",
  saving,
  canSave = true,
}: StickyActionBarProps) {
  return (
    <div className={cn("fixed bottom-0 left-0 right-0 border-t-2 border-t-blue-200 bg-gradient-to-b from-white to-slate-50/50 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-lg", className)}>
      <div className="max-w-5xl mx-auto px-8 py-4 flex items-center justify-between gap-4">
        {left && <div className="text-sm font-medium text-slate-700" aria-live="polite">{left}</div>}
        <div className="flex gap-3">
          {right}
          {onCancel && (
            <Button variant="outline" color="blue" size="default" onClick={onCancel} aria-label={cancelText} className="h-11 px-6 sm:px-8">
              {cancelText}
            </Button>
          )}
          {onSave && (
            <Button color="blue" size="default" onClick={onSave} disabled={saving || !canSave} aria-label={saveText} className="h-11 px-6 sm:px-8 bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md hover:shadow-lg">
              {saving ? "Đang lưu..." : saveText}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
