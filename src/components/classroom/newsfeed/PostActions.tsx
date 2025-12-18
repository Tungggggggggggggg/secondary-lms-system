"use client";

import { MoreHorizontal, Pin, Pencil, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { PostItem } from "@/components/classroom/newsfeed/PostCard";

interface PostActionsProps {
  post: PostItem;
  onPin?: (postId: string, pin: boolean) => void;
  onEdit?: (postId: string) => void;
  onDelete?: (postId: string) => void;
  className?: string;
}

export default function PostActions({ post, onPin, onEdit, onDelete, className }: PostActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-50",
            className
          )}
          aria-label="Tác vụ bài viết"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[12rem]">
        <DropdownMenuItem onSelect={() => onPin?.(post.id, !post.pinnedAt)}>
          <Pin className="h-4 w-4 mr-2 text-blue-600" /> {post.pinnedAt ? "Bỏ ghim" : "Ghim trên đầu"}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onEdit?.(post.id)}>
          <Pencil className="h-4 w-4 mr-2 text-slate-700" /> Chỉnh sửa
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onDelete?.(post.id)} className="text-rose-600">
          <Trash2 className="h-4 w-4 mr-2" /> Xóa bài
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
