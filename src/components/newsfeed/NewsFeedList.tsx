"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PostCard, { PostItem } from "./PostCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface NewsFeedListProps {
  classroomId: string;
}

export default function NewsFeedList({ classroomId }: NewsFeedListProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const hasMore = useMemo(() => (totalPages == null ? true : page < totalPages), [page, totalPages]);

  const fetchPage = useCallback(
    async (targetPage: number) => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch(`/api/classrooms/${classroomId}/announcements?page=${targetPage}&pageSize=${pageSize}`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || "Không thể tải thông báo");
        const data = (json.data || []) as PostItem[];
        setPosts((prev) => (targetPage === 1 ? data : [...prev, ...data]));
        const p = json.pagination;
        if (p) setTotalPages(p.totalPages ?? null);
        setPage(targetPage);
      } catch (e: any) {
        setError(e?.message || "Có lỗi xảy ra");
      } finally {
        setIsLoading(false);
      }
    },
    [classroomId, pageSize]
  );

  useEffect(() => {
    if (classroomId) fetchPage(1);
  }, [classroomId, fetchPage]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    if (!hasMore) return;
    const io = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (entry.isIntersecting && !isLoading) {
        fetchPage(page + 1);
      }
    });
    io.observe(sentinelRef.current);
    return () => io.disconnect();
  }, [fetchPage, hasMore, isLoading, page]);

  return (
    <div className="space-y-4">
      {isLoading && posts.length === 0 ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-sm text-gray-500">Chưa có thông báo nào.</div>
      ) : (
        <div className="space-y-4">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
          <div ref={sentinelRef} />
          {!isLoading && hasMore && (
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => fetchPage(page + 1)}>Tải thêm</Button>
            </div>
          )}
        </div>
      )}
      {error && <div className="text-sm text-red-600">{error}</div>}
    </div>
  );
}


