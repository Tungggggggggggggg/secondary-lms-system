"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface DuplicateAssignmentDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultTitle: string;
  onConfirm: (title: string, copyClassrooms: boolean) => Promise<void> | void;
  loading?: boolean;
}

export default function DuplicateAssignmentDialog({ open, onOpenChange, defaultTitle, onConfirm, loading }: DuplicateAssignmentDialogProps) {
  const [title, setTitle] = useState(defaultTitle || "");
  const [copyClasses, setCopyClasses] = useState(true);

  useEffect(() => {
    if (open) setTitle(defaultTitle || "");
  }, [open, defaultTitle]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader variant="teacher">
          <DialogTitle variant="teacher">Nhân bản bài tập</DialogTitle>
          <DialogDescription variant="teacher">Tạo một bản sao với tiêu đề mới.</DialogDescription>
        </DialogHeader>
        <div className="p-6 space-y-4">
          <div>
            <Label htmlFor="dup-title">Tiêu đề mới</Label>
            <Input id="dup-title" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-2" placeholder="Nhập tiêu đề cho bản sao" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={copyClasses} onChange={(e) => setCopyClasses(e.target.checked)} />
            <span>Sao chép gán lớp</span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Huỷ</Button>
          <Button onClick={() => onConfirm(title.trim() || defaultTitle, copyClasses)} disabled={loading || !(title.trim() || defaultTitle)}>
            {loading ? "Đang xử lý..." : "Nhân bản"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
