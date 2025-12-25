import { useCallback, useState } from "react";

export interface ClassroomPostItem {
  id: string;
  content: string;
  createdAt: string;
  author?: { id: string; fullname: string; email: string };
  attachments?: Array<{ id: string; name: string; size: number; mimeType: string }>
}

export function useClassroomPosts() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState<ClassroomPostItem[]>([]);
  const [pagination, setPagination] = useState<{ page: number; pageSize: number; total: number; totalPages: number } | null>(null);

  const fetchPosts = useCallback(async (classroomId: string, page = 1, pageSize = 10) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`/api/classrooms/${classroomId}/announcements?page=${page}&pageSize=${pageSize}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Không thể tải thông báo");
      setPosts(json.data || []);
      setPagination(json.pagination || null);
    } catch (e: any) {
      setError(e?.message || "Có lỗi xảy ra");
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { posts, isLoading, error, pagination, fetchPosts };
}


