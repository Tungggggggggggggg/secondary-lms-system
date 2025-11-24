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
  status?: "APPROVED" | "REJECTED"; // optional để tương thích
  author: {
    id: string;
    fullname: string;
    email: string;
  };
  replies?: AnnouncementComment[]; // Cho nested comments
}

export interface UseAnnouncementsOptions {
  enableCreate?: boolean; // Cho phép tạo announcement (teacher)
  enableUpload?: boolean; // Cho phép upload attachment (teacher)
  enableRecentComments?: boolean; // Cho phép fetch recent comments (student)
  enableAttachmentDownload?: boolean; // Cho phép get attachment download URL (student)
}

export function useAnnouncements(options: UseAnnouncementsOptions = {}) {
  const {
    enableCreate = false,
    enableUpload = false,
    enableRecentComments = false,
    enableAttachmentDownload = false,
  } = options;

  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [pagination, setPagination] = useState<{ page: number; pageSize: number; total: number; totalPages: number } | null>(null);
  
  // State quản lý comments theo announcementId
  const [comments, setComments] = useState<Record<string, AnnouncementComment[]>>({});
  const [recentComments, setRecentComments] = useState<Record<string, AnnouncementComment[]>>({});
  const [commentsTotal, setCommentsTotal] = useState<Record<string, number>>({});
  const [commentsLoading, setCommentsLoading] = useState<Record<string, boolean>>({});
  const [recentCommentsLoading, setRecentCommentsLoading] = useState<Record<string, boolean>>({});
  const [commentsPagination, setCommentsPagination] = useState<Record<string, { page: number; pageSize: number; total: number; totalPages: number }>>({});
  
  // Đánh dấu đã fetch để tránh gọi lặp
  const [fetchedComments, setFetchedComments] = useState<Record<string, boolean>>({});
  const [recentFetched, setRecentFetched] = useState<Record<string, boolean>>({});
  const [commentsFetched, setCommentsFetched] = useState<Record<string, boolean>>({});

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
        if (enableCreate) {
          toast({ title: "Lỗi tải thông báo", description: msg, variant: "destructive" });
        }
      } finally {
        setIsLoading(false);
      }
    },
    [toast, enableCreate]
  );

  // Teacher actions: hide / unhide / delete comment
  const hideComment = useCallback(
    async (announcementId: string, commentId: string): Promise<boolean> => {
      if (!enableCreate) return false;
      try {
        const res = await fetch(`/api/announcements/${announcementId}/comments/${commentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "hide" }),
        });
        if (!res.ok) throw new Error("Ẩn bình luận thất bại");
        // Optimistic: cập nhật status trong state
        setComments((prev) => {
          const list = prev[announcementId] || [];
          const mapStatus = (arr: AnnouncementComment[]): AnnouncementComment[] => arr.map((c) => ({
            ...c,
            status: c.id === commentId ? "REJECTED" : c.status,
            replies: c.replies ? mapStatus(c.replies) : c.replies,
          }));
          return { ...prev, [announcementId]: mapStatus(list) };
        });
        return true;
      } catch (e: any) {
        toast({ title: "Lỗi", description: e?.message || "Ẩn bình luận thất bại", variant: "destructive" });
        return false;
      }
    },
    [enableCreate, toast]
  );

  const unhideComment = useCallback(
    async (announcementId: string, commentId: string): Promise<boolean> => {
      if (!enableCreate) return false;
      try {
        const res = await fetch(`/api/announcements/${announcementId}/comments/${commentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "unhide" }),
        });
        if (!res.ok) throw new Error("Hiện bình luận thất bại");
        setComments((prev) => {
          const list = prev[announcementId] || [];
          const mapStatus = (arr: AnnouncementComment[]): AnnouncementComment[] => arr.map((c) => ({
            ...c,
            status: c.id === commentId ? "APPROVED" : c.status,
            replies: c.replies ? mapStatus(c.replies) : c.replies,
          }));
          return { ...prev, [announcementId]: mapStatus(list) };
        });
        return true;
      } catch (e: any) {
        toast({ title: "Lỗi", description: e?.message || "Hiện bình luận thất bại", variant: "destructive" });
        return false;
      }
    },
    [enableCreate, toast]
  );

  const deleteComment = useCallback(
    async (announcementId: string, commentId: string): Promise<boolean> => {
      if (!enableCreate) return false;
      try {
        const res = await fetch(`/api/announcements/${announcementId}/comments/${commentId}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Xóa bình luận thất bại");
        // Lựa chọn: xoá khỏi UI (nếu là top-level) hoặc đánh dấu REJECTED như hide
        setComments((prev) => {
          const list = prev[announcementId] || [];
          const markOrRemove = (arr: AnnouncementComment[]): AnnouncementComment[] => arr
            .filter((c) => c.id !== commentId) // xoá nếu là top-level
            .map((c) => ({
              ...c,
              replies: c.replies ? c.replies.filter((r) => r.id !== commentId) : c.replies,
            }));
          return { ...prev, [announcementId]: markOrRemove(list) };
        });
        return true;
      } catch (e: any) {
        toast({ title: "Lỗi", description: e?.message || "Xóa bình luận thất bại", variant: "destructive" });
        return false;
      }
    },
    [enableCreate, toast]
  );

  const createAnnouncement = useCallback(
    async (classroomId: string, content: string): Promise<AnnouncementItem | null> => {
      if (!enableCreate) {
        console.warn("[WARN] createAnnouncement called but enableCreate is false");
        return null;
      }
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
    [fetchAnnouncements, pagination?.pageSize, toast, enableCreate]
  );

  const getAttachmentDownloadUrl = useCallback(async (fileId: string): Promise<string | null> => {
    if (!enableAttachmentDownload) {
      console.warn("[WARN] getAttachmentDownloadUrl called but enableAttachmentDownload is false");
      return null;
    }
    try {
      const res = await fetch(`/api/announcements/attachments/${fileId}/download`, { method: "GET" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Không thể lấy link tải");
      return json.url as string;
    } catch {
      return null;
    }
  }, [enableAttachmentDownload]);

  // Lấy 1-2 comments ngẫu nhiên (recent comments) - chỉ cho student
  const fetchRecentComments = useCallback(
    async (announcementId: string, options?: { force?: boolean }): Promise<void> => {
      if (!enableRecentComments) {
        console.warn("[WARN] fetchRecentComments called but enableRecentComments is false");
        return;
      }
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
        const total = json.total as number | undefined;
        
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
    [recentFetched, enableRecentComments]
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
        // Teacher: idempotent check với fetchedComments
        // Student: idempotent check với commentsFetched
        if (enableCreate) {
          // Teacher logic
          if (page === 1 && !options?.force && fetchedComments[announcementId]) {
            return;
          }
        } else {
          // Student logic
          if (page === 1 && !options?.force && commentsFetched[announcementId]) {
            return;
          }
        }

        setCommentsLoading((prev) => ({ ...prev, [announcementId]: true }));
        const includeHidden = enableCreate ? "&includeHidden=true" : "";
        const res = await fetch(
          `/api/announcements/${announcementId}/comments?page=${page}&pageSize=${pageSize}${includeHidden}`,
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
          
          // Cập nhật commentsTotal từ pagination.total (tổng số top-level comments)
          // Fix bug: cập nhật cho cả teacher và student
          if (paginationData.total !== undefined) {
            setCommentsTotal((prev) => ({
              ...prev,
              [announcementId]: paginationData.total,
            }));
          }
        }

        // Đánh dấu đã fetched trang đầu tiên
        if (page === 1) {
          if (enableCreate) {
            setFetchedComments((prev) => ({ ...prev, [announcementId]: true }));
          } else {
            setCommentsFetched((prev) => ({ ...prev, [announcementId]: true }));
          }
        }
      } catch (e: any) {
        const msg = e?.message || "Có lỗi xảy ra";
        console.error(`[ERROR] fetchComments for announcement ${announcementId}:`, msg);
        if (enableCreate) {
          toast({ title: "Lỗi tải bình luận", description: msg, variant: "destructive" });
        } else {
          toast({ title: "Lỗi tải bình luận", description: msg, variant: "destructive" });
        }
        // Tránh vòng lặp: vẫn đánh dấu đã cố gắng fetch để không spam
        if (page === 1) {
          if (enableCreate) {
            setFetchedComments((prev) => ({ ...prev, [announcementId]: true }));
          } else {
            setCommentsFetched((prev) => ({ ...prev, [announcementId]: true }));
          }
        }
      } finally {
        setCommentsLoading((prev) => ({ ...prev, [announcementId]: false }));
      }
    }, [toast, fetchedComments, commentsFetched, enableCreate]);

  // Cho phép đánh dấu stale để buộc reload lần sau (chỉ cho teacher)
  const markCommentsStale = useCallback((announcementId: string) => {
    if (!enableCreate) {
      console.warn("[WARN] markCommentsStale called but enableCreate is false");
      return;
    }
    setFetchedComments((prev) => {
      const next = { ...prev };
      delete next[announcementId];
      return next;
    });
  }, [enableCreate]);

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
        
        // Cập nhật recent comments: nếu là top-level comment và enableRecentComments, refresh lại recent comments
        if (!parentId && enableRecentComments) {
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
    [toast, fetchRecentComments, enableRecentComments]
  );

  const uploadAttachment = useCallback(
    async (announcementId: string, file: File): Promise<boolean> => {
      if (!enableUpload) {
        console.warn("[WARN] uploadAttachment called but enableUpload is false");
        return false;
      }
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
    [toast, enableUpload]
  );

  // Return consistent interface - always include all properties for type safety
  return {
    announcements,
    pagination,
    isLoading,
    error,
    fetchAnnouncements,
    // Teacher-only features (undefined if not enabled)
    createAnnouncement: enableCreate ? createAnnouncement : undefined,
    uploadAttachment: enableUpload ? uploadAttachment : undefined,
    hideComment: enableCreate ? hideComment : undefined,
    unhideComment: enableCreate ? unhideComment : undefined,
    deleteComment: enableCreate ? deleteComment : undefined,
    // Student-only features (undefined if not enabled)
    getAttachmentDownloadUrl: enableAttachmentDownload ? getAttachmentDownloadUrl : undefined,
    fetchRecentComments: enableRecentComments ? fetchRecentComments : undefined,
    recentComments: enableRecentComments ? recentComments : {},
    recentCommentsLoading: enableRecentComments ? recentCommentsLoading : {},
    recentFetched: enableRecentComments ? recentFetched : {},
    // Comments functions
    comments,
    commentsTotal,
    commentsLoading,
    commentsPagination,
    fetchComments,
    // Teacher uses fetchedComments, Student uses commentsFetched
    fetchedComments: enableCreate ? fetchedComments : undefined,
    markCommentsStale: enableCreate ? markCommentsStale : undefined,
    commentsFetched: !enableCreate ? commentsFetched : undefined,
    addComment,
  };
}

