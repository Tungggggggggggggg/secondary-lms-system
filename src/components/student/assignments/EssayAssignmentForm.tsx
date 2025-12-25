"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Clock, CheckCircle2 } from "lucide-react";

interface EssayAssignmentFormProps {
  assignmentId: string;
  onSubmit: (content: string) => Promise<void>;
  initialContent?: string;
  isLoading?: boolean;
  dueDate?: string | null;
  isSubmitted?: boolean;
  openAt?: string | null;
  lockAt?: string | null;
  timeLimitMinutes?: number | null;
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
  openAt = null,
  lockAt = null,
  timeLimitMinutes = null,
}: EssayAssignmentFormProps) {
  const [content, setContent] = useState(initialContent);
  const { toast } = useToast();
  const openAtDate = openAt ? new Date(openAt) : null;
  const lockAtDate = lockAt ? new Date(lockAt) : (dueDate ? new Date(dueDate) : null);
  const storageKey = `essay_started_at_${assignmentId}`;
  const draftKey = `essay_draft_${assignmentId}`;
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [remainingSec, setRemainingSec] = useState<number | null>(null);
  const autoSubmittedRef = useRef(false);

  // Load local draft on mount (if any) when chưa nộp
  useEffect(() => {
    if (isSubmitted) return;
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(draftKey) : null;
      if (raw) {
        const parsed = JSON.parse(raw) as { content: string } | null;
        if (parsed && typeof parsed.content === "string" && !initialContent) {
          setContent(parsed.content);
        }
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId, isSubmitted]);

  // Persist draft when content changes (debounced by effect tick)
  useEffect(() => {
    if (isSubmitted) return;
    const id = window.setTimeout(() => {
      try {
        window.localStorage.setItem(draftKey, JSON.stringify({ content }));
      } catch {}
    }, 300);
    return () => window.clearTimeout(id);
  }, [content, draftKey, isSubmitted]);

  useEffect(() => {
    if (isSubmitted) return;
    const now = new Date();
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null;
    if (stored) {
      const d = new Date(stored);
      if (!isNaN(d.getTime())) setStartedAt(d);
    } else {
      setStartedAt(now);
      try { window.localStorage.setItem(storageKey, now.toISOString()); } catch {}
    }
  }, [isSubmitted, storageKey]);

  useEffect(() => {
    if (isSubmitted) return;
    if (!startedAt) return;
    let effectiveDeadline: Date | null = lockAtDate ? new Date(lockAtDate) : null;
    if (timeLimitMinutes && timeLimitMinutes > 0) {
      const limitEnd = new Date(startedAt.getTime() + timeLimitMinutes * 60 * 1000);
      effectiveDeadline = effectiveDeadline ? new Date(Math.min(effectiveDeadline.getTime(), limitEnd.getTime())) : limitEnd;
    }
    if (!effectiveDeadline) return;
    const tick = () => {
      const now = new Date();
      const sec = Math.max(0, Math.floor((effectiveDeadline!.getTime() - now.getTime()) / 1000));
      setRemainingSec(sec);
      if (sec <= 0 && !autoSubmittedRef.current) {
        autoSubmittedRef.current = true;
        onSubmit(content.trim()).catch(() => {});
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [content, lockAtDate, isSubmitted, onSubmit, startedAt, timeLimitMinutes]);

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
    try { window.localStorage.removeItem(draftKey); } catch {}
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
    try { window.localStorage.removeItem(draftKey); } catch {}
  };

  // Overdue when countdown has reached 0 (preferred), else fallback to endAt/dueDate check
  const isOverdue = remainingSec != null ? remainingSec <= 0 : !!(lockAtDate && new Date() > lockAtDate);
  const countdownLabel = (() => {
    if (remainingSec == null) return null;
    const m = Math.floor(remainingSec / 60);
    const s = remainingSec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  })();

  return (
    <form
      onSubmit={isSubmitted ? handleUpdate : handleSubmit}
      className="bg-card rounded-2xl p-6 shadow-lg border border-border"
    >
      <div className="mb-6">
        <Label htmlFor="content" className="text-base font-semibold text-foreground mb-2 block">
          Nội dung bài làm <span className="text-red-500">*</span>
        </Label>
        {countdownLabel && (
          <div className="mb-2 text-sm text-green-800" aria-live="polite">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Thời gian còn lại: <span className="font-semibold">{countdownLabel}</span>
            </span>
          </div>
        )}
        <Textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Nhập nội dung bài làm của bạn..."
          rows={12}
          disabled={isLoading || isOverdue}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground mt-2">
          Bạn có thể nhập văn bản dài, hệ thống sẽ tự động lưu khi bạn nộp bài
        </p>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="text-sm text-muted-foreground">
          {content.trim().length > 0 && (
            <span>{content.trim().length} ký tự</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isSubmitted && (
            <p className="text-sm text-green-600 font-medium inline-flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" /> Bài làm đã được lưu (chưa nộp)
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


