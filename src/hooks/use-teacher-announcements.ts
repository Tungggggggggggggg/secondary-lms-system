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

export interface AnnouncementComment {
  id: string;
  content: string;
  createdAt: string;
  parentId?: string | null;
  author: {
    id: string;
    fullname: string;
    email: string;
  };
  replies?: AnnouncementComment[]; // Cho nested comments
}

export function useTeacherAnnouncements() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [pagination, setPagination] = useState<{ page: number; pageSize: number; total: number; totalPages: number } | null>(null);
  // State quản lý comments theo announcementId
  const [comments, setComments] = useState<Record<string, AnnouncementComment[]>>({});
  const [commentsTotal, setCommentsTotal] = useState<Record<string, number>>({}); // Tổng số top-level comments
  const [commentsLoading, setCommentsLoading] = useState<Record<string, boolean>>({});
  const [commentsPagination, setCommentsPagination] = useState<Record<string, { page: number; pageSize: number; total: number; totalPages: number }>>({});
  // Đánh dấu đã fetch để tránh gọi lặp khi không có dữ liệu trả về
  const [fetchedComments, setFetchedComments] = useState<Record<string, boolean>>({});

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

  // Lấy danh sách comments của một announcement (với nested structure)
  const fetchComments = useCallback(
    async (
      announcementId: string,
      page = 1,
      pageSize = 10,
      options?: { force?: boolean }
    ): Promise<void> => {
      try {
        // Idempotent: nếu đã fetch trang đầu (page===1) và không force, bỏ qua
        if (page === 1 && !options?.force && fetchedComments[announcementId]) {
          return;
        }
        setCommentsLoading((prev) => ({ ...prev, [announcementId]: true }));
        const res = await fetch(
          `/api/announcements/${announcementId}/comments?page=${page}&pageSize=${pageSize}`,
          { cache: "no-store" }
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || "Không thể tải bình luận");
        
        // API trả về nested structure với replies (top-level comments có replies array)
        const commentsData = (json.data || []) as AnnouncementComment[];
        const paginationData = json.pagination || null;
        
        // Giữ nguyên nested structure (không flatten)
        setComments((prev) => {
          if (page === 1) {
            return {
              ...prev,
              [announcementId]: commentsData,
            };
          } else {
            // Append thêm top-level comments (không flatten replies)
            return {
              ...prev,
              [announcementId]: [...(prev[announcementId] || []), ...commentsData],
            };
          }
        });
        
        if (paginationData) {
          setCommentsPagination((prev) => ({
            ...prev,
            [announcementId]: paginationData,
          }));
        }

        // Đánh dấu đã fetched trang đầu tiên
        if (page === 1) {
          setFetchedComments((prev) => ({ ...prev, [announcementId]: true }));
        }
      } catch (e: any) {
        const msg = e?.message || "Có lỗi xảy ra";
        console.error(`[ERROR] fetchComments for announcement ${announcementId}:`, msg);
        toast({ title: "Lỗi tải bình luận", description: msg, variant: "destructive" });
        // Tránh vòng lặp: vẫn đánh dấu đã cố gắng fetch để không spam
        if (page === 1) {
          setFetchedComments((prev) => ({ ...prev, [announcementId]: true }));
        }
      } finally {
        setCommentsLoading((prev) => ({ ...prev, [announcementId]: false }));
      }
    },
    [toast, fetchedComments]
  );

  // Cho phép đánh dấu stale để buộc reload lần sau
  const markCommentsStale = useCallback((announcementId: string) => {
    setFetchedComments((prev) => {
      const next = { ...prev };
      delete next[announcementId];
      return next;
    });
  }, []);

  // Thêm bình luận mới (hoặc reply)
  const addComment = useCallback(
    async (announcementId: string, content: string, parentId?: string | null): Promise<boolean> => {
      try {
        setError(null);
        const res = await fetch(`/api/announcements/${announcementId}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, parentId: parentId || null }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || "Không thể bình luận");
        
        // Thêm comment mới vào state
        const newComment = json.data as AnnouncementComment;
        
        // Nếu là reply, thêm vào replies của parent comment
        if (parentId) {
          setComments((prev) => {
            const currentComments = prev[announcementId] || [];
            const updatedComments = currentComments.map((comment) => {
              if (comment.id === parentId) {
                return {
                  ...comment,
                  replies: [...(comment.replies || []), newComment],
                };
              }
              return comment;
            });
            return {
              ...prev,
              [announcementId]: updatedComments,
            };
          });
        } else {
          // Top-level comment
          setComments((prev) => ({
            ...prev,
            [announcementId]: [...(prev[announcementId] || []), newComment],
          }));
        }
        
        // Cập nhật pagination và total
        if (!parentId) {
          // Nếu là top-level comment, cập nhật total
          setCommentsTotal((prev) => ({
            ...prev,
            [announcementId]: (prev[announcementId] || 0) + 1,
          }));
        }
        
        setCommentsPagination((prev) => {
          const current = prev[announcementId];
          if (current) {
            return {
              ...prev,
              [announcementId]: {
                ...current,
                total: current.total + 1,
              },
            };
          }
          return prev;
        });
        
        toast({ title: parentId ? "Đã trả lời bình luận" : "Đã thêm bình luận" });
        return true;
      } catch (e: any) {
        const msg = e?.message || "Có lỗi xảy ra";
        setError(msg);
        console.error(`[ERROR] addComment for announcement ${announcementId}:`, msg);
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
    // Comments functions
    comments,
    commentsTotal,
    commentsLoading,
    commentsPagination,
    fetchComments,
    fetchedComments,
    markCommentsStale,
  };
}


