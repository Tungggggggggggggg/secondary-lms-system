import { useCallback, useState } from "react";

export interface StudentAnnouncementItem {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author?: { id: string; fullname: string; email: string };
  attachments?: Array<{
    id: string;
    name: string;
    path: string;
    size: number;
    mimeType: string;
    createdAt: string;
  }>;
  _count?: { comments: number };
}

export function useStudentAnnouncements() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<StudentAnnouncementItem[]>([]);
  const [pagination, setPagination] = useState<{ page: number; pageSize: number; total: number; totalPages: number } | null>(null);

  const fetchAnnouncements = useCallback(
    async (classId: string, page = 1, pageSize = 10): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch(`/api/classrooms/${classId}/announcements?page=${page}&pageSize=${pageSize}`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || "Không thể tải thông báo");
        setAnnouncements(json.data || []);
        setPagination(json.pagination || null);
      } catch (e: any) {
        setError(e?.message || "Có lỗi xảy ra");
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const getAttachmentDownloadUrl = useCallback(async (fileId: string): Promise<string | null> => {
    try {
      const res = await fetch(`/api/announcements/attachments/${fileId}/download`, { method: "GET" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Không thể lấy link tải");
      return json.url as string;
    } catch {
      return null;
    }
  }, []);

  return { announcements, pagination, isLoading, error, fetchAnnouncements, getAttachmentDownloadUrl };
}
