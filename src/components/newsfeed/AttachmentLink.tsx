"use client";

import { useCallback, useState } from "react";

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
        <button
          type="button"
          onClick={handleOpen}
          disabled={isLoading}
          className="inline-flex items-center justify-center rounded-full px-3 sm:px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-sky-500 shadow-sm hover:shadow-md hover:brightness-110 disabled:opacity-60"
        >
          Xem
        </button>
        <button
          type="button"
          onClick={handleDownload}
          disabled={isLoading}
          className="inline-flex items-center justify-center rounded-full px-3 sm:px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-indigo-500 shadow-sm hover:shadow-md hover:brightness-110 disabled:opacity-60"
        >
          Tải
        </button>
      </div>
    </div>
  );
}


