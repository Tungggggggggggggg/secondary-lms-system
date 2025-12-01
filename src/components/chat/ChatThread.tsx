"use client";

import { useEffect, useRef } from "react";
import type { MessageDTO } from "@/hooks/use-chat";
import { useSession } from "next-auth/react";
import { CornerUpLeft, Image as ImageIcon, Paperclip } from "lucide-react";
import { getChatFileUrl } from "@/lib/supabase-upload";
import { cn } from "@/lib/utils";

type Participant = {
  userId: string;
  fullname: string;
  role: string;
};

type Props = {
  messages: MessageDTO[];
  participants?: Participant[];
  onReply: (message: MessageDTO) => void;
  selfUserId?: string;
  };

export default function ChatThread({ messages, participants, onReply, selfUserId }: Props) {
  const { data: session } = useSession();
  const me = (selfUserId || (session?.user as any)?.id) as string | undefined;
  const currentRole = (session?.user as any)?.role as string | undefined;
  const endRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const jumpToMessage = (mid?: string | null) => {
    if (!mid) return;
    const el = messageRefs.current[mid] || document.getElementById(`msg-${mid}`) as HTMLDivElement | null;
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-indigo-400", "ring-offset-1", "ring-offset-gray-50");
      setTimeout(() => {
        el.classList.remove("ring-2", "ring-indigo-400", "ring-offset-1", "ring-offset-gray-50");
      }, 1200);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-4 space-y-2 bg-gray-50/80 scrollbar-stable overscroll-contain">
      {messages.map((m, index) => {
        const mine = (!!me && m.sender.id === me) || (!!currentRole && m.sender.role === currentRole);
        const sender = !mine ? m.sender : undefined;
        const createdAt = new Date(m.createdAt);

        const prevMessage = messages[index - 1];
        const nextMessage = messages[index + 1];

        const isNewDate = !prevMessage || formatDateLabel(new Date(prevMessage.createdAt)) !== formatDateLabel(createdAt);
        const isFirstOfGroup = isNewDate || prevMessage?.sender.id !== m.sender.id;
        const isLastOfGroup = !nextMessage || nextMessage?.sender.id !== m.sender.id || formatDateLabel(new Date(nextMessage.createdAt)) !== formatDateLabel(createdAt);

        return (
          <div key={m.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {isNewDate && (
              <div className="flex justify-center my-3">
                <span className="px-3 py-1 rounded-full bg-gray-200 text-xs text-gray-600 font-medium">
                  {formatDateLabel(createdAt)}
                </span>
              </div>
            )}
            <div className={cn("flex items-end gap-2 w-full", mine ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[75%] flex flex-col group", mine ? "items-end" : "items-start")}>
                {!mine && isFirstOfGroup && sender && (
                  <div className="mb-1 text-xs text-gray-500 ml-2">
                    <span className="font-medium">{sender.fullname}</span>
                  </div>
                )}
                <div className="relative">
                  <button
                    onClick={() => onReply(m)}
                    className={cn(
                      "absolute top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-white/90 border border-gray-200 text-gray-700 shadow-sm opacity-0 group-hover:opacity-100 hover:opacity-100 focus:opacity-100 transition-opacity",
                      mine ? "-left-9" : "-right-9"
                    )}
                    title="Trả lời"
                  >
                    <CornerUpLeft className="h-4 w-4" />
                  </button>
                  <div
                    className={cn(
                      "px-3 py-2 shadow-sm",
                      mine
                        ? "bg-indigo-600 text-white"
                        : "bg-white text-gray-800 border border-gray-200",
                      {
                        "rounded-t-2xl": isFirstOfGroup,
                        "rounded-b-2xl": isLastOfGroup,
                        "rounded-tl-sm": !isFirstOfGroup && !mine,
                        "rounded-tr-sm": !isFirstOfGroup && !!mine,
                        "rounded-bl-2xl": !!mine,
                        "rounded-br-2xl": !mine,
                      }
                    )}
                    id={`msg-${m.id}`}
                    ref={(el) => { messageRefs.current[m.id] = el; }}
                  >
                    {m.parentMessage && (
                      <button
                        type="button"
                        onClick={() => jumpToMessage(m.parentId)}
                        className={cn(
                          "border-l-2 pl-2 mb-1 text-xs text-left w-full cursor-pointer hover:underline",
                          mine ? "border-indigo-200/60" : "border-gray-400/60"
                        )}
                        title="Đi tới tin nhắn gốc"
                      >
                        <p className="font-semibold text-inherit">{m.parentMessage.sender.fullname}</p>
                        <p className="truncate italic opacity-80">{m.parentMessage.content}</p>
                      </button>
                    )}
                    {m.content && m.content.trim() && (
                      <p className="whitespace-pre-wrap break-words text-sm">{m.content}</p>
                    )}
                                                            {m.attachments && m.attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {m.attachments.map((att) => {
                          const url = getChatFileUrl(att.storagePath);
                          const isImage = att.mimeType.startsWith("image/");
                          return (
                            <div key={att.id} className="text-xs">
                              {isImage ? (
                                <a href={url} target="_blank" rel="noreferrer" className="block group">
                                  <img
                                    src={url}
                                    alt={att.name}
                                    className="max-h-40 rounded-md border border-gray-200 mb-1 object-contain bg-white"
                                  />
                                  <div
                                    className={cn(
                                      "flex items-center gap-1 text-[11px] group-hover:underline",
                                      mine ? "text-indigo-100" : "text-gray-600"
                                    )}
                                  >
                                    <ImageIcon className="h-3 w-3" />
                                    <span className="truncate max-w-[160px]">{att.name}</span>
                                  </div>
                                </a>
                              ) : (
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={cn(
                                    "inline-flex items-center gap-1 text-[11px] underline-offset-2 hover:underline",
                                    mine ? "text-indigo-100" : "text-indigo-600"
                                  )}
                                >
                                  <Paperclip className="h-3 w-3" />
                                  <span className="truncate max-w-[160px]">{att.name}</span>
                                </a>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                {isLastOfGroup && (
                  <div
                    className={cn(
                      "mt-1 text-[10px]",
                      mine ? "text-gray-400 pr-1" : "text-gray-400 pl-1"
                    )}
                  >
                    {formatTimeLabel(createdAt)}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}

function formatDateLabel(date: Date): string {
  const today = new Date();
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const diff = (d.getTime() - t.getTime()) / (1000 * 60 * 60 * 24);
  if (diff === 0) return "Hôm nay";
  if (diff === -1) return "Hôm qua";
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatTimeLabel(date: Date): string {
  return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function normalizeRoleLabel(role: string): string {
  switch (role) {
    case "TEACHER":
      return "GV";
    case "STUDENT":
      return "HS";
    case "PARENT":
      return "PH";
    default:
      return role;
  }
}
