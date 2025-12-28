"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MessageDTO } from "@/hooks/use-chat";
import { useSession } from "next-auth/react";
import { ChevronDown, ChevronUp, CornerUpLeft, Image as ImageIcon, Paperclip, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateLabel, formatTimeLabel } from "@/lib/date";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getSessionUserId(session: unknown): string | undefined {
  if (!isRecord(session)) return undefined;
  const user = session.user;
  if (!isRecord(user)) return undefined;
  const id = user.id;
  return typeof id === "string" ? id : undefined;
}

type Participant = {
  userId: string;
  fullname: string;
  role: string;
};

type Props = {
  color?: "green" | "blue" | "amber";
  messages: MessageDTO[];
  participants?: Participant[];
  onReply: (message: MessageDTO) => void;
  selfUserId?: string;
};

export default function ChatThread({ color = "amber", messages, participants, onReply, selfUserId }: Props) {
  const { data: session } = useSession();
  const me = selfUserId || getSessionUserId(session);
  const endRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [search, setSearch] = useState("");
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const ringColor = color === "green" ? "ring-green-400" : color === "blue" ? "ring-blue-400" : "ring-amber-400";
  const jumpToMessage = useCallback((mid?: string | null) => {
    if (!mid) return;
    const el = messageRefs.current[mid] || document.getElementById(`msg-${mid}`) as HTMLDivElement | null;
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", ringColor, "ring-offset-1", "ring-offset-gray-50");
      setTimeout(() => {
        el.classList.remove("ring-2", ringColor, "ring-offset-1", "ring-offset-gray-50");
      }, 1200);
    }
  }, [ringColor]);

  const normalizedSearch = search.trim().toLowerCase();
  const matchIds = useMemo(() => {
    if (normalizedSearch.length < 2) return [];
    return messages
      .filter((m) => (m.content || "").toLowerCase().includes(normalizedSearch))
      .map((m) => m.id);
  }, [messages, normalizedSearch]);

  useEffect(() => {
    if (normalizedSearch.length < 2) {
      setActiveMatchIndex(0);
      return;
    }
    setActiveMatchIndex(0);
    if (matchIds.length > 0) {
      jumpToMessage(matchIds[0]);
    }
  }, [jumpToMessage, matchIds, normalizedSearch]);

  const canNavigateMatches = matchIds.length > 0;
  const goPrev = () => {
    if (!canNavigateMatches) return;
    const nextIndex = (activeMatchIndex - 1 + matchIds.length) % matchIds.length;
    setActiveMatchIndex(nextIndex);
    jumpToMessage(matchIds[nextIndex]);
  };

  const goNext = () => {
    if (!canNavigateMatches) return;
    const nextIndex = (activeMatchIndex + 1) % matchIds.length;
    setActiveMatchIndex(nextIndex);
    jumpToMessage(matchIds[nextIndex]);
  };

  const palette = {
    threadBg: color === "green" ? "bg-gradient-to-b from-green-50/50 to-emerald-50/30" : color === "blue" ? "bg-gradient-to-b from-blue-50/50 to-indigo-50/30" : "bg-gradient-to-b from-amber-50/50 to-orange-50/30",
    dateBg: color === "green" ? "bg-green-200/70 text-green-800" : color === "blue" ? "bg-blue-200/70 text-blue-800" : "bg-amber-200/70 text-amber-800",
    replyBtn: color === "green" ? "bg-green-500 text-white" : color === "blue" ? "bg-blue-500 text-white" : "bg-amber-500 text-white",
    mineBubble: color === "green" ? "bg-green-600 text-white" : color === "blue" ? "bg-blue-600 text-white" : "bg-amber-600 text-white",
    otherBubble: color === "green" ? "bg-green-50 text-gray-800 border border-green-200" : color === "blue" ? "bg-blue-50 text-gray-800 border border-blue-200" : "bg-amber-50 text-gray-800 border border-amber-200",
    parentPreviewMine: color === "green" ? "border-green-200/60" : color === "blue" ? "border-blue-200/60" : "border-amber-200/60",
    attachTextMine: color === "green" ? "text-green-100" : color === "blue" ? "text-blue-100" : "text-amber-100",
    attachTextOther: color === "green" ? "text-green-700" : color === "blue" ? "text-blue-700" : "text-amber-700",
    linkOther: color === "green" ? "text-green-600" : color === "blue" ? "text-blue-600" : "text-amber-600",
  };

  const searchPalette = {
    bg: color === "green" ? "bg-green-50/70" : color === "blue" ? "bg-blue-50/70" : "bg-amber-50/70",
    border: color === "green" ? "border-green-200" : color === "blue" ? "border-blue-200" : "border-amber-200",
    icon: color === "green" ? "text-green-500" : color === "blue" ? "text-blue-500" : "text-amber-500",
    ring: color === "green" ? "focus:ring-green-400" : color === "blue" ? "focus:ring-blue-400" : "focus:ring-amber-400",
  };

  return (
    <div className={cn("flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 space-y-2 scrollbar-stable overscroll-contain min-w-0", palette.threadBg)}>
      <div className={cn("sticky top-0 z-10 -mx-3 px-3 pb-2", searchPalette.bg, "backdrop-blur")}> 
        <div className={cn("rounded-2xl border p-2", searchPalette.border, "bg-white/70")}> 
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4", searchPalette.icon)} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm trong hội thoại..."
                className={cn(
                  "w-full h-10 pl-9 pr-10 text-sm rounded-xl border bg-white outline-none focus:ring-2",
                  searchPalette.border,
                  searchPalette.ring
                )}
              />
              {search.trim() ? (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-slate-100"
                  aria-label="Xóa tìm kiếm"
                >
                  <X className="h-4 w-4 text-slate-500" />
                </button>
              ) : null}
            </div>
            <button
              type="button"
              onClick={goPrev}
              disabled={!canNavigateMatches}
              className={cn(
                "h-10 w-10 inline-flex items-center justify-center rounded-xl border bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed",
                searchPalette.border
              )}
              aria-label="Kết quả trước"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={!canNavigateMatches}
              className={cn(
                "h-10 w-10 inline-flex items-center justify-center rounded-xl border bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed",
                searchPalette.border
              )}
              aria-label="Kết quả sau"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
          {normalizedSearch.length >= 2 ? (
            <div className="mt-1 text-xs text-slate-600">
              {matchIds.length > 0 ? (
                <span>
                  Kết quả <span className="font-semibold text-slate-900">{activeMatchIndex + 1}</span> / {matchIds.length}
                </span>
              ) : (
                <span>Không tìm thấy kết quả.</span>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {messages.map((m, index) => {
        const mine = !!me && m.sender.id === me;
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
                <span className={cn("px-3 py-1 rounded-full text-xs font-medium", palette.dateBg)}>
                  {formatDateLabel(createdAt)}
                </span>
              </div>
            )}
            <div className={cn("flex items-end gap-2", mine ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[75%] flex flex-col group", mine ? "items-end" : "items-start")}>
                {!mine && isFirstOfGroup && sender && (
                  <div className="mb-1 text-xs text-gray-500 ml-2">
                    <span className="font-medium">{sender.fullname}</span>
                  </div>
                )}
                <div className="relative group/msg">
                  <button
                    onClick={() => onReply(m)}
                    className={cn(
                      "absolute top-0 z-10 p-1 rounded-full shadow-md opacity-0 group-hover/msg:opacity-100 hover:opacity-100 focus:opacity-100 transition-opacity",
                      palette.replyBtn,
                      mine ? "right-0 -translate-y-1/2" : "left-0 -translate-y-1/2"
                    )}
                    title="Trả lời"
                  >
                    <CornerUpLeft className="h-3.5 w-3.5" />
                  </button>
                  <div
                    className={cn(
                      "px-3 py-2 shadow-sm",
                      mine ? palette.mineBubble : palette.otherBubble,
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
                          mine ? palette.parentPreviewMine : "border-gray-400/60"
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
                          const url = att.url ?? "";
                          const isImage = att.mimeType.startsWith("image/");
                          return (
                            <div key={att.id} className="text-xs">
                              {isImage ? (
                                url ? (
                                  <a href={url} target="_blank" rel="noreferrer" className="block group">
                                    <img
                                      src={url}
                                      alt={att.name}
                                      className="max-h-40 rounded-md border border-gray-200 mb-1 object-contain bg-white"
                                    />
                                    <div
                                      className={cn(
                                        "flex items-center gap-1 text-[11px] group-hover:underline",
                                        mine ? palette.attachTextMine : palette.attachTextOther
                                      )}
                                    >
                                      <ImageIcon className="h-3 w-3" />
                                      <span className="truncate max-w-[160px]">{att.name}</span>
                                    </div>
                                  </a>
                                ) : (
                                  <div className={cn("flex items-center gap-1 text-[11px]", mine ? palette.attachTextMine : palette.attachTextOther)}>
                                    <ImageIcon className="h-3 w-3" />
                                    <span className="truncate max-w-[160px]">{att.name}</span>
                                    <span className="opacity-80">(không có link)</span>
                                  </div>
                                )
                              ) : (
                                url ? (
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={cn(
                                      "inline-flex items-center gap-1 text-[11px] underline-offset-2 hover:underline",
                                      mine ? palette.attachTextMine : palette.linkOther
                                    )}
                                  >
                                    <Paperclip className="h-3 w-3" />
                                    <span className="truncate max-w-[160px]">{att.name}</span>
                                  </a>
                                ) : (
                                  <span className={cn("inline-flex items-center gap-1 text-[11px]", mine ? palette.attachTextMine : palette.linkOther)}>
                                    <Paperclip className="h-3 w-3" />
                                    <span className="truncate max-w-[160px]">{att.name}</span>
                                    <span className="opacity-80">(không có link)</span>
                                  </span>
                                )
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
