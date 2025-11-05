import { useCallback, useState } from "react";
import { useToast } from "./use-toast";

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

export function useStudentAnnouncements() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<StudentAnnouncementItem[]>([]);
  const [pagination, setPagination] = useState<{ page: number; pageSize: number; total: number; totalPages: number } | null>(null);
  // State quản lý comments theo announcementId
  const [comments, setComments] = useState<Record<string, AnnouncementComment[]>>({});
  const [recentComments, setRecentComments] = useState<Record<string, AnnouncementComment[]>>({}); // 1-2 comments ngẫu nhiên
  const [commentsTotal, setCommentsTotal] = useState<Record<string, number>>({}); // Tổng số top-level comments
  const [commentsLoading, setCommentsLoading] = useState<Record<string, boolean>>({});
  const [recentCommentsLoading, setRecentCommentsLoading] = useState<Record<string, boolean>>({});
  const [commentsPagination, setCommentsPagination] = useState<Record<string, { page: number; pageSize: number; total: number; totalPages: number }>>({});
  // Đánh dấu đã fetch để tránh vòng lặp khi không có dữ liệu
  const [recentFetched, setRecentFetched] = useState<Record<string, boolean>>({});
  const [commentsFetched, setCommentsFetched] = useState<Record<string, boolean>>({});

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

  // Lấy 1-2 comments ngẫu nhiên (recent comments) - nếu <= 2 thì lấy tất cả, nếu > 3 thì lấy 1-2 ngẫu nhiên
  const fetchRecentComments = useCallback(
    async (announcementId: string, options?: { force?: boolean }): Promise<void> => {
      try {
        if (!options?.force && recentFetched[announcementId]) return;
        setRecentCommentsLoading((prev) => ({ ...prev, [announcementId]: true }));
        const res = await fetch(
          `/api/announcements/${announcementId}/comments?recent=true`,
          { cache: "no-store" }
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || "Không thể tải bình luận gần đây");
        
        const recentData = (json.data || []) as AnnouncementComment[];
        const total = json.total as number | undefined; // Tổng số top-level comments
        
        setRecentComments((prev) => ({
          ...prev,
          [announcementId]: recentData,
        }));
        
        // Lưu total comments
        if (total !== undefined) {
          setCommentsTotal((prev) => ({
            ...prev,
            [announcementId]: total,
          }));
        }

        setRecentFetched((prev) => ({ ...prev, [announcementId]: true }));
      } catch (e: any) {
        const msg = e?.message || "Có lỗi xảy ra";
        console.error(`[ERROR] fetchRecentComments for announcement ${announcementId}:`, msg);
        // Không hiển thị toast cho recent comments để tránh spam
        setRecentFetched((prev) => ({ ...prev, [announcementId]: true }));
      } finally {
        setRecentCommentsLoading((prev) => ({ ...prev, [announcementId]: false }));
      }
    },
    [recentFetched]
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
        if (page === 1 && !options?.force && commentsFetched[announcementId]) return;
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

        if (page === 1) {
          setCommentsFetched((prev) => ({ ...prev, [announcementId]: true }));
        }
      } catch (e: any) {
        const msg = e?.message || "Có lỗi xảy ra";
        console.error(`[ERROR] fetchComments for announcement ${announcementId}:`, msg);
        toast({ title: "Lỗi tải bình luận", description: msg, variant: "destructive" });
        if (page === 1) {
          setCommentsFetched((prev) => ({ ...prev, [announcementId]: true }));
        }
      } finally {
        setCommentsLoading((prev) => ({ ...prev, [announcementId]: false }));
      }
    },
    [toast, commentsFetched]
  );

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
        
        // Cập nhật recent comments: nếu là top-level comment, refresh lại recent comments
        // (vì logic ngẫu nhiên phức tạp, nên fetch lại từ server)
        if (!parentId) {
          // Fetch lại recent comments sau khi thêm top-level comment
          setTimeout(() => {
            fetchRecentComments(announcementId);
          }, 100);
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
    [toast, fetchRecentComments]
  );

  return {
    announcements,
    pagination,
    isLoading,
    error,
    fetchAnnouncements,
    getAttachmentDownloadUrl,
    // Comments functions
    comments,
    recentComments,
    commentsTotal,
    commentsLoading,
    recentCommentsLoading,
    commentsPagination,
    fetchComments,
    fetchRecentComments,
    recentFetched,
    commentsFetched,
    addComment,
  };
}
