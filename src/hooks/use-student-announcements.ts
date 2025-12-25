import { useAnnouncements, AnnouncementItem, AnnouncementComment } from "./use-announcements";

// Re-export AnnouncementComment for backward compatibility
export type { AnnouncementComment };

// StudentAnnouncementItem is the same as AnnouncementItem, maintain backward compatibility
export type StudentAnnouncementItem = AnnouncementItem;

export function useStudentAnnouncements() {
  // Use unified hook with student options
  const hook = useAnnouncements({
    enableCreate: false,
    enableUpload: false,
    enableRecentComments: true,
    enableAttachmentDownload: true,
  });

  // Return with same interface as before for backward compatibility
  return {
    announcements: hook.announcements,
    pagination: hook.pagination,
    isLoading: hook.isLoading,
    error: hook.error,
    fetchAnnouncements: hook.fetchAnnouncements,
    getAttachmentDownloadUrl: hook.getAttachmentDownloadUrl!,
    // Comments functions
    comments: hook.comments,
    recentComments: hook.recentComments,
    commentsTotal: hook.commentsTotal,
    commentsLoading: hook.commentsLoading,
    recentCommentsLoading: hook.recentCommentsLoading,
    commentsPagination: hook.commentsPagination,
    fetchComments: hook.fetchComments,
    fetchRecentComments: hook.fetchRecentComments!,
    recentFetched: hook.recentFetched,
    commentsFetched: hook.commentsFetched!,
    addComment: hook.addComment,
  };
}
