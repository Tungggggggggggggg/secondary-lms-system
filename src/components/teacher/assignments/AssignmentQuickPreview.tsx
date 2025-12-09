"use client";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { AssignmentT } from "@/hooks/use-assignments";
import { Button } from "@/components/ui/button";

type Props = {
  assignment: AssignmentT | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onViewDetail?: (id: string) => void;
  onEdit?: (id: string) => void;
  onSubmissions?: (id: string) => void;
};

export default function AssignmentQuickPreview({ assignment, open, onOpenChange, onViewDetail, onEdit, onSubmissions }: Props) {
  const a = assignment;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader variant="teacher">
          <DialogTitle variant="teacher">{a?.title || "Xem nhanh bài tập"}</DialogTitle>
          <DialogDescription variant="teacher">{a?.description || ""}</DialogDescription>
        </DialogHeader>
        <div className="p-6 space-y-3">
          <div className="text-sm text-slate-600"><span className="font-medium">Loại:</span> {a?.type === "ESSAY" ? "Tự luận" : "Trắc nghiệm"}</div>
          <div className="text-sm text-slate-600"><span className="font-medium">Mở:</span> {a?.openAt ? new Date(a.openAt).toLocaleString() : "—"}</div>
          <div className="text-sm text-slate-600"><span className="font-medium">Đóng/Hạn:</span> {a?.lockAt || a?.dueDate ? new Date((a?.lockAt || a?.dueDate) as any).toLocaleString() : "—"}</div>
          <div className="text-sm text-slate-600"><span className="font-medium">Đã nộp:</span> {a?._count?.submissions ?? 0}</div>
          <div className="text-xs text-slate-500">Tạo lúc: {a?.createdAt ? new Date(a.createdAt).toLocaleString() : "—"}</div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => a && onSubmissions?.(a.id)}>Bài nộp</Button>
          <Button variant="outline" onClick={() => a && onEdit?.(a.id)}>Chỉnh sửa</Button>
          <Button onClick={() => a && onViewDetail?.(a.id)}>Xem chi tiết</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
