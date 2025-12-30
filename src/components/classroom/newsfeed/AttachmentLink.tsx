"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";

export interface AttachmentItem {
  id: string;
  name: string;
  size: number;
  mimeType: string;
}

interface AttachmentLinkProps {
  file: AttachmentItem;
}

export default function AttachmentLink({ file }: AttachmentLinkProps) {
  const [isLoading, setIsLoading] = useState(false);

  const resolveUrl = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch(`/api/announcements/attachments/${file.id}/download`, { method: "GET" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Không thể lấy link");
      return json.url as string;
    } catch {
      return null;
    }
  }, [file.id]);

  const handleOpen = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    const url = await resolveUrl();
    setIsLoading(false);
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }, [isLoading, resolveUrl]);

  const handleDownload = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    const url = await resolveUrl();
    if (!url) {
      setIsLoading(false);
      return;
    }

    try {
      // Tải file về như blob để có thể ép trình duyệt tải xuống (kể cả với URL cross-origin)
      const response = await fetch(url);
      if (!response.ok) {
        setIsLoading(false);
        return;
      }
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();

      // Giải phóng URL tạm
      URL.revokeObjectURL(blobUrl);
    } finally {
      setIsLoading(false);
    }
  }, [file.name, isLoading, resolveUrl]);

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white shadow-sm">
          <span className="text-xl text-sky-500">📄</span>
        </div>
        <div className="min-w-0">
          <div
            className="truncate text-sm font-medium text-slate-900"
            title={file.name}
          >
            {file.name}
          </div>
          <div className="text-[11px] text-slate-500">
            {Math.round(file.size / 1024)} KB
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        <Button type="button" color="blue" size="sm" onClick={handleOpen} disabled={isLoading} className="rounded-full px-3 sm:px-3.5">
          Xem
        </Button>
        <Button type="button" color="blue" variant="outline" size="sm" onClick={handleDownload} disabled={isLoading} className="rounded-full px-3 sm:px-3.5">
          Tải
        </Button>
      </div>
    </div>
  );
}
