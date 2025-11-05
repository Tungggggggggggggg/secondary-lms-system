"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PostCard, { PostItem, CommentItem } from "./PostCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useStudentAnnouncements, AnnouncementComment } from "@/hooks/use-student-announcements";

interface NewsFeedListProps {
  classroomId: string;
}

export default function NewsFeedList({ classroomId }: NewsFeedListProps) {
  const {
    announcements,
    pagination,
    isLoading,
    error,
    fetchAnnouncements,
    comments,
    recentComments,
    commentsTotal,
    commentsLoading,
    recentCommentsLoading,
    commentsPagination,
    fetchComments,
    fetchRecentComments,
    addComment,
  } = useStudentAnnouncements();

  const [page, setPage] = useState(1);
  const pageSize = 10;
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Map announcements từ hook sang PostItem format
  const posts: PostItem[] = useMemo(() => {
    return announcements.map((ann) => ({
      id: ann.id,
      content: ann.content,
      createdAt: ann.createdAt,
      author: ann.author,
      attachments: ann.attachments?.map((att) => ({
        id: att.id,
        name: att.name,
        size: att.size,
        mimeType: att.mimeType,
      })),
      _count: ann._count,
    }));
  }, [announcements]);

  const totalPages = pagination?.totalPages ?? null;
  const hasMore = useMemo(() => (totalPages == null ? true : page < totalPages), [page, totalPages]);

  // Fetch announcements
  const fetchPage = useCallback(
    async (targetPage: number) => {
      try {
        await fetchAnnouncements(classroomId, targetPage, pageSize);
        setPage(targetPage);
      } catch (e: any) {
        console.error(`[ERROR] fetchPage for classroom ${classroomId}:`, e);
      }
    },
    [classroomId, pageSize, fetchAnnouncements]
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

  // Handler để fetch recent comments
  const handleFetchRecentComments = useCallback(
    (announcementId: string) => {
      fetchRecentComments(announcementId);
    },
    [fetchRecentComments]
  );

  // Handler để fetch comments cho một post
  const handleFetchComments = useCallback(
    (announcementId: string, pageNum?: number) => {
      fetchComments(announcementId, pageNum || 1, 10);
    },
    [fetchComments]
  );

  // Handler để add comment (hỗ trợ reply với parentId)
  const handleAddComment = useCallback(
    async (announcementId: string, content: string, parentId?: string | null): Promise<boolean> => {
      return await addComment(announcementId, content, parentId);
    },
    [addComment]
  );

  // Map recent comments từ hook sang CommentItem format
  const getRecentCommentsForPost = useCallback(
    (announcementId: string): CommentItem[] => {
      const postRecentComments = recentComments[announcementId] || [];
      return postRecentComments.map((comment: AnnouncementComment) => ({
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        parentId: comment.parentId,
        author: comment.author,
      }));
    },
    [recentComments]
  );

  // Map comments từ hook sang CommentItem format (giữ nguyên nested structure)
  const getCommentsForPost = useCallback(
    (announcementId: string): CommentItem[] => {
      const postComments = comments[announcementId] || [];
      // API trả về top-level comments với replies array, giữ nguyên structure
      return postComments.map((comment: AnnouncementComment) => ({
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        parentId: comment.parentId,
        author: comment.author,
        replies: comment.replies?.map((reply) => ({
          id: reply.id,
          content: reply.content,
          createdAt: reply.createdAt,
          parentId: reply.parentId,
          author: reply.author,
        })),
      }));
    },
    [comments]
  );

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
            <PostCard
              key={p.id}
              post={p}
              recentComments={getRecentCommentsForPost(p.id)}
              recentCommentsLoading={recentCommentsLoading[p.id] || false}
              commentsTotal={commentsTotal[p.id] || 0}
              comments={getCommentsForPost(p.id)}
              commentsLoading={commentsLoading[p.id] || false}
              commentsPagination={commentsPagination[p.id]}
              onFetchRecentComments={handleFetchRecentComments}
              onFetchComments={handleFetchComments}
              onAddComment={handleAddComment}
              showComments={true}
            />
          ))}
          <div ref={sentinelRef} />
          {!isLoading && hasMore && (
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => fetchPage(page + 1)}>
                Tải thêm
              </Button>
            </div>
          )}
        </div>
      )}
      {error && <div className="text-sm text-red-600">{error}</div>}
    </div>
  );
}


