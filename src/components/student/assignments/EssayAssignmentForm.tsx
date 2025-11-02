"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface EssayAssignmentFormProps {
  assignmentId: string;
  onSubmit: (content: string) => Promise<void>;
  initialContent?: string;
  isLoading?: boolean;
  dueDate?: string | null;
  isSubmitted?: boolean;
}

/**
 * Component form làm bài essay
 */
export default function EssayAssignmentForm({
  assignmentId,
  onSubmit,
  initialContent = "",
  isLoading = false,
  dueDate,
  isSubmitted = false,
}: EssayAssignmentFormProps) {
  const [content, setContent] = useState(initialContent);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập nội dung bài làm",
        variant: "destructive",
      });
      return;
    }

    // Kiểm tra deadline
    if (dueDate && new Date(dueDate) < new Date()) {
      toast({
        title: "Lỗi",
        description: "Đã quá hạn nộp bài",
        variant: "destructive",
      });
      return;
    }

    await onSubmit(content.trim());
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập nội dung bài làm",
        variant: "destructive",
      });
      return;
    }

    await onSubmit(content.trim());
  };

  const isOverdue = dueDate && new Date(dueDate) < new Date();

  return (
    <form
      onSubmit={isSubmitted ? handleUpdate : handleSubmit}
      className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200"
    >
      <div className="mb-6">
        <Label htmlFor="content" className="text-base font-semibold text-gray-800 mb-2 block">
          Nội dung bài làm <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Nhập nội dung bài làm của bạn..."
          rows={12}
          disabled={isLoading || isOverdue}
          className="resize-none"
        />
        <p className="text-xs text-gray-500 mt-2">
          Bạn có thể nhập văn bản dài, hệ thống sẽ tự động lưu khi bạn nộp bài
        </p>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          {content.trim().length > 0 && (
            <span>{content.trim().length} ký tự</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isSubmitted && (
            <p className="text-sm text-green-600 font-medium">
              ✓ Bài làm đã được lưu (chưa nộp)
            </p>
          )}
          <Button
            type="submit"
            disabled={isLoading || isOverdue || !content.trim()}
          >
            {isLoading
              ? "Đang xử lý..."
              : isSubmitted
              ? "Cập nhật bài làm"
              : isOverdue
              ? "Đã quá hạn"
              : "Nộp bài"}
          </Button>
        </div>
      </div>
    </form>
  );
}


