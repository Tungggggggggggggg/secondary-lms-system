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
    setIsLoading(false);
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, [file.name, isLoading, resolveUrl]);

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="truncate" title={file.name}>
        {file.name} <span className="text-xs text-gray-400">({Math.round(file.size / 1024)} KB)</span>
      </span>
      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={handleOpen} disabled={isLoading}>
          Xem
        </Button>
        <Button variant="outline" onClick={handleDownload} disabled={isLoading}>
          Tải
        </Button>
      </div>
    </div>
  );
}


