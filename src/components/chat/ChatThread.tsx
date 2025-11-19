"use client";

import { useEffect, useRef } from "react";
import type { MessageDTO } from "@/hooks/use-chat";
import { useSession } from "next-auth/react";
import { Image as ImageIcon, Paperclip } from "lucide-react";
import { getChatFileUrl } from "@/lib/supabase-upload";

type Participant = {
  userId: string;
  fullname: string;
  role: string;
};

type Props = {
  messages: MessageDTO[];
  participants?: Participant[];
};

export default function ChatThread({ messages, participants }: Props) {
  const { data: session } = useSession();
  const me = (session?.user as any)?.id as string | undefined;
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  let lastDateLabel: string | null = null;
  let lastSenderId: string | null = null;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-gradient-to-br from-white to-indigo-50/40 rounded-xl border border-gray-200">
      {messages.map((m) => {
        const mine = me && m.senderId === me;
        const createdAt = new Date(m.createdAt);
        const dateLabel = formatDateLabel(createdAt);
        const isNewDate = dateLabel !== lastDateLabel;
        const isFirstOfGroup = isNewDate || m.senderId !== lastSenderId;
        const sender = !mine && participants ? participants.find((p) => p.userId === m.senderId) : undefined;

        lastDateLabel = dateLabel;
        lastSenderId = m.senderId;

        return (
          <div key={m.id} className="space-y-1">
            {isNewDate && (
              <div className="flex justify-center my-2">
                <span className="px-3 py-1 rounded-full bg-gray-100 text-xs text-gray-600">{dateLabel}</span>
              </div>
            )}
            <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[75%]">
                {!mine && isFirstOfGroup && sender && (
                  <div className="mb-0.5 text-xs text-gray-500">
                    <span className="font-medium">{sender.fullname}</span>
                    <span className="ml-1 px-1.5 py-0.5 rounded-full bg-gray-100 text-[10px] uppercase tracking-wide">
                      {normalizeRoleLabel(sender.role)}
                    </span>
                  </div>
                )}
                <div
                  className={`${mine ? "bg-indigo-600 text-white" : "bg-white text-gray-800"} rounded-2xl px-3 py-2 shadow`}
                >
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
                              <a
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="block group"
                              >
                                <img
                                  src={url}
                                  alt={att.name}
                                  className="max-h-40 rounded-md border border-gray-200 mb-1 object-contain bg-white"
                                />
                                <div className="flex items-center gap-1 text-[11px] text-gray-100 group-hover:underline">
                                  <ImageIcon className="h-3 w-3" />
                                  <span className="truncate max-w-[160px]">{att.name}</span>
                                </div>
                              </a>
                            ) : (
                              <a
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className={`inline-flex items-center gap-1 text-[11px] underline-offset-2 hover:underline ${
                                  mine ? "text-indigo-100" : "text-indigo-600"
                                }`}
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
                  <div
                    className={`mt-1 text-[10px] flex ${
                      mine ? "justify-end text-indigo-100/80" : "justify-end text-gray-400"
                    }`}
                  >
                    {formatTimeLabel(createdAt)}
                  </div>
                </div>
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
