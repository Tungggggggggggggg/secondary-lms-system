"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import gsap from "gsap";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTeacherAnnouncements, AnnouncementComment } from "@/hooks/use-teacher-announcements";
import { useLessons } from "@/hooks/use-lessons";
import PostCard, { PostItem, CommentItem } from "@/components/newsfeed/PostCard";

export default function ClassroomOverview() {
    const rootRef = useRef<HTMLDivElement>(null);
    const params = useParams();
    const classroomId = params.classroomId as string;

    const {
        announcements,
        isLoading,
        fetchAnnouncements,
        createAnnouncement,
        addComment,
        comments,
        commentsTotal,
        commentsLoading,
        commentsPagination,
        fetchComments,
        fetchedComments,
    } = useTeacherAnnouncements();
    const { uploadToAnnouncement } = useLessons();

    const [content, setContent] = useState("");
    const [files, setFiles] = useState<File[]>([]);

    useEffect(() => {
        if (!rootRef.current) return;
        gsap.fromTo(
            rootRef.current.querySelectorAll("section,aside"),
            { opacity: 0, y: 10 },
            { opacity: 1, y: 0, duration: 0.4, stagger: 0.08, ease: "power1.out" }
        );
    }, [announcements]);

    useEffect(() => {
        if (classroomId) fetchAnnouncements(classroomId, 1, 10);
    }, [classroomId, fetchAnnouncements]);

    // Tự động load comments cho tất cả announcements khi có announcements (idempotent)
    useEffect(() => {
        if (announcements.length === 0) return;
        announcements.forEach((ann) => {
            if (!fetchedComments[ann.id]) {
                fetchComments(ann.id, 1, 10);
            }
        });
    }, [announcements, fetchedComments, fetchComments]);

    const canPost = useMemo(() => !!classroomId && content.trim().length > 0, [classroomId, content]);

    async function handlePost() {
        if (!classroomId || !content.trim()) return;
        const created = await createAnnouncement(classroomId, content.trim());
        if (created && files.length > 0) {
            await uploadToAnnouncement(created.id, files);
            await fetchAnnouncements(classroomId, 1, 10);
        }
        setContent("");
        setFiles([]);
    }

    // Handler để fetch comments cho một announcement
    const handleFetchComments = useCallback(
        (announcementId: string, pageNum?: number) => {
            fetchComments(announcementId, pageNum || 1, 10, { force: pageNum !== 1 });
        },
        [fetchComments]
    );

    // Handler để add comment (hỗ trợ reply với parentId)
    const handleAddComment = useCallback(
        async (announcementId: string, content: string, parentId?: string | null): Promise<boolean> => {
            const success = await addComment(announcementId, content, parentId);
            if (success && classroomId) {
                await fetchAnnouncements(classroomId, 1, 10);
            }
            return success;
        },
        [addComment, classroomId, fetchAnnouncements]
    );

    // Map announcements sang PostItem format
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

    // Map comments từ hook sang CommentItem format (với nested structure)
    const getCommentsForPost = useCallback(
        (announcementId: string): CommentItem[] => {
            const postComments = comments[announcementId] || [];
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
        <div ref={rootRef} className="grid gap-6 md:grid-cols-3">
            <section className="md:col-span-2 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                <h2 className="text-base font-semibold mb-3">Bảng tin</h2>

                <div className="mb-4 space-y-3">
                    <Textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Chia sẻ thông báo cho lớp..."
                    />
                    <div className="flex items-center gap-3">
                        <input
                            type="file"
                            multiple
                            onChange={(e) => setFiles(e.target.files ? Array.from(e.target.files) : [])}
                        />
                        <Button onClick={handlePost} disabled={!canPost}>
                            Đăng
                        </Button>
                    </div>
                    {files.length > 0 && (
                        <div className="text-xs text-gray-500">
                            Đính kèm: {files.map((f) => f.name).join(", ")}
                        </div>
                    )}
                </div>

                {isLoading ? (
                    <div className="space-y-3">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {posts.map((post) => (
                            <PostCard
                                key={post.id}
                                post={post}
                                recentComments={[]} // Teacher không cần recent comments
                                recentCommentsLoading={false}
                                commentsTotal={commentsTotal[post.id] || 0}
                                comments={getCommentsForPost(post.id)}
                                commentsLoading={commentsLoading[post.id] || false}
                                commentsPagination={commentsPagination[post.id]}
                                onFetchComments={handleFetchComments}
                                onAddComment={handleAddComment}
                                showComments={true}
                            />
                        ))}
                    </div>
                )}
            </section>
            <aside className="rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                <h3 className="text-base font-semibold mb-3">Sắp tới</h3>
                <div className="text-sm text-gray-500">Chưa có hoạt động nào nhé~</div>
            </aside>
        </div>
    );
}
