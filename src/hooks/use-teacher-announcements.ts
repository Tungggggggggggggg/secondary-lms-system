import { useAnnouncements, AnnouncementItem, AnnouncementComment } from "./use-announcements";

// Re-export types for backward compatibility
export type { AnnouncementItem, AnnouncementComment };

export function useTeacherAnnouncements() {
  // Use unified hook with teacher options
  const hook = useAnnouncements({
    enableCreate: true,
    enableUpload: true,
    enableRecentComments: false,
    enableAttachmentDownload: false,
  });

  // Return with same interface as before for backward compatibility
  return {
    announcements: hook.announcements,
    pagination: hook.pagination,
    isLoading: hook.isLoading,
    error: hook.error,
    fetchAnnouncements: hook.fetchAnnouncements,
    createAnnouncement: hook.createAnnouncement!,
    addComment: hook.addComment,
    uploadAttachment: hook.uploadAttachment!,
    // Comments functions
    comments: hook.comments,
    commentsTotal: hook.commentsTotal,
    commentsLoading: hook.commentsLoading,
    commentsPagination: hook.commentsPagination,
    fetchComments: hook.fetchComments,
    fetchedComments: hook.fetchedComments!,
    markCommentsStale: hook.markCommentsStale!,
  };
}
