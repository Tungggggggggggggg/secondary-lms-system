import { useCallback, useState } from "react";
import { useToast } from "./use-toast";

export interface AnnouncementItem {
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

export function useTeacherAnnouncements() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [pagination, setPagination] = useState<{ page: number; pageSize: number; total: number; totalPages: number } | null>(null);

  const fetchAnnouncements = useCallback(
    async (classroomId: string, page = 1, pageSize = 10): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch(`/api/classrooms/${classroomId}/announcements?page=${page}&pageSize=${pageSize}`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || "Không thể tải thông báo");
        setAnnouncements(json.data || []);
        setPagination(json.pagination || null);
      } catch (e: any) {
        const msg = e?.message || "Có lỗi xảy ra";
        setError(msg);
        toast({ title: "Lỗi tải thông báo", description: msg, variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    },
    [toast]
  );

  const createAnnouncement = useCallback(
    async (classroomId: string, content: string): Promise<AnnouncementItem | null> => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch(`/api/classrooms/${classroomId}/announcements`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || "Không thể đăng thông báo");
        toast({ title: "Đã đăng thông báo" });
        // Refresh trang đầu tiên
        await fetchAnnouncements(classroomId, 1, pagination?.pageSize || 10);
        return json.data as AnnouncementItem;
      } catch (e: any) {
        const msg = e?.message || "Có lỗi xảy ra";
        setError(msg);
        toast({ title: "Lỗi đăng thông báo", description: msg, variant: "destructive" });
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchAnnouncements, pagination?.pageSize, toast]
  );

  const addComment = useCallback(
    async (announcementId: string, content: string): Promise<boolean> => {
      try {
        setError(null);
        const res = await fetch(`/api/announcements/${announcementId}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || "Không thể bình luận");
        return true;
      } catch (e: any) {
        const msg = e?.message || "Có lỗi xảy ra";
        setError(msg);
        toast({ title: "Lỗi bình luận", description: msg, variant: "destructive" });
        return false;
      }
    },
    [toast]
  );

  const uploadAttachment = useCallback(
    async (announcementId: string, file: File): Promise<boolean> => {
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch(`/api/announcements/${announcementId}/attachments`, { method: "POST", body: form });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || "Upload thất bại");
        return true;
      } catch (e: any) {
        const msg = e?.message || "Có lỗi xảy ra";
        setError(msg);
        toast({ title: "Lỗi upload đính kèm", description: msg, variant: "destructive" });
        return false;
      }
    },
    [toast]
  );

  return {
    announcements,
    pagination,
    isLoading,
    error,
    fetchAnnouncements,
    createAnnouncement,
    addComment,
    uploadAttachment,
  };
}


