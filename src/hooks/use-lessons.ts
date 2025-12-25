import { useCallback, useState } from "react";
import { useToast } from "./use-toast";

// Hook tiện ích upload file bài giảng/đính kèm (bucket lessons)
// Hiện tái sử dụng endpoint đính kèm announcement để lưu trữ file trong bucket `lessons`.

export function useLessons() {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadToAnnouncement = useCallback(
    async (announcementId: string, files: File[]): Promise<boolean> => {
      if (!announcementId || files.length === 0) return true;
      try {
        setIsUploading(true);
        setError(null);
        for (const f of files) {
          const form = new FormData();
          form.append("file", f);
          const res = await fetch(`/api/announcements/${announcementId}/attachments`, {
            method: "POST",
            body: form,
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json?.message || `Upload thất bại: ${f.name}`);
        }
        toast({ title: "Đã upload đính kèm" });
        return true;
      } catch (e: any) {
        const msg = e?.message || "Có lỗi xảy ra";
        setError(msg);
        toast({ title: "Lỗi upload", description: msg, variant: "destructive" });
        return false;
      } finally {
        setIsUploading(false);
      }
    },
    [toast]
  );

  return { isUploading, error, uploadToAnnouncement };
}


