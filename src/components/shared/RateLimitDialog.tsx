"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type RateLimitDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  retryAfterSeconds: number;
  title?: string;
  description?: string;
  onRetry?: () => void | Promise<void>;
};

/**
 * Lấy retryAfterSeconds từ JSON body hoặc header `Retry-After`.
 *
 * @param res - fetch Response
 * @param json - body JSON (nếu có)
 * @returns retryAfterSeconds (>= 1) hoặc null
 */
export function getRetryAfterSecondsFromResponse(res: Response, json: unknown): number | null {
  if (json && typeof json === "object") {
    const v = (json as { retryAfterSeconds?: unknown }).retryAfterSeconds;
    if (typeof v === "number" && Number.isFinite(v) && v > 0) return Math.floor(v);
  }

  const header = res.headers.get("Retry-After");
  if (header) {
    const parsed = Number(header);
    if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
  }

  return null;
}

function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;

  if (m <= 0) return `${r} giây`;
  if (r === 0) return `${m} phút`;
  return `${m} phút ${r} giây`;
}

/**
 * Dialog thông báo khi người dùng chạm rate limit (HTTP 429) để hướng dẫn thử lại.
 */
export default function RateLimitDialog(props: RateLimitDialogProps) {
  const {
    open,
    onOpenChange,
    retryAfterSeconds,
    title = "Bạn đang sử dụng AI quá nhiều",
    description = "Vui lòng thử lại sau ít phút để hệ thống phục vụ ổn định.",
    onRetry,
  } = props;

  const initialRemaining = useMemo(
    () => Math.max(0, Math.floor(retryAfterSeconds || 0)),
    [retryAfterSeconds]
  );

  const [remaining, setRemaining] = useState<number>(initialRemaining);

  useEffect(() => {
    if (!open) return;
    setRemaining(initialRemaining);
  }, [open, initialRemaining]);

  useEffect(() => {
    if (!open) return;
    if (remaining <= 0) return;

    const id = window.setInterval(() => {
      setRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => window.clearInterval(id);
  }, [open, remaining]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="mt-2 rounded-lg border bg-slate-50 p-3 text-sm text-slate-700">
          {remaining > 0 ? (
            <div>
              Bạn có thể thử lại sau <span className="font-semibold">{formatDuration(remaining)}</span>.
            </div>
          ) : (
            <div>
              Bạn có thể thử lại ngay bây giờ.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
          {onRetry && (
            <Button
              onClick={async () => {
                if (remaining > 0) return;
                onOpenChange(false);
                await onRetry();
              }}
              disabled={remaining > 0}
            >
              Thử lại
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
