"use client";

import type { MouseEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { createConversationFromTeacher } from "@/hooks/use-chat";
import { cn } from "@/lib/utils";

interface MessageStudentButtonProps {
  studentId: string;
  classroomId: string;
  className?: string;
}

export default function MessageStudentButton({
  studentId,
  classroomId,
  className,
}: MessageStudentButtonProps) {
  const router = useRouter();
  const [sending, setSending] = useState(false);

  const handleClick = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (sending) return;

    try {
      setSending(true);
      const res = await createConversationFromTeacher(studentId, true, classroomId);
      const id = res?.conversationId as string | undefined;
      if (id) {
        router.push(`/dashboard/teacher/messages?open=${encodeURIComponent(id)}`);
      }
    } catch (error) {
      console.error("[MessageStudentButton] createConversation error", error);
    } finally {
      setSending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={sending}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-purple-600 hover:bg-purple-50 transition-all disabled:opacity-60",
        className
      )}
      aria-label="Nhắn tin cho học sinh"
    >
      <MessageCircle className="h-4 w-4" />
      <span>{sending ? "Đang mở..." : "Nhắn tin"}</span>
    </button>
  );
}
