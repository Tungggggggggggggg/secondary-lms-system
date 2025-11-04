"use client";

import AttachmentLink, { AttachmentItem } from "./AttachmentLink";

export interface PostItem {
  id: string;
  content: string;
  createdAt: string;
  author?: { id: string; fullname: string; email: string };
  attachments?: AttachmentItem[];
}

interface PostCardProps {
  post: PostItem;
}

export default function PostCard({ post }: PostCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
      <div className="text-sm text-gray-600 mb-2">
        <span className="font-medium">{post.author?.fullname || "Giáo viên"}</span>
        <span className="ml-2">•</span>
        <span className="ml-2">{new Date(post.createdAt).toLocaleString()}</span>
      </div>
      <div className="whitespace-pre-line text-gray-800 mb-3">{post.content}</div>
      {post.attachments && post.attachments.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
          <div className="font-medium mb-1">Đính kèm</div>
          <ul className="space-y-1">
            {post.attachments.map((f) => (
              <li key={f.id}>
                <AttachmentLink file={f} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}


