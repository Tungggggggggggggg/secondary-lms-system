"use client";

"use client";

import { useEffect, useMemo, useState } from "react";
import { useConversations, useMessages, markRead, MessageDTO } from "@/hooks/use-chat";
import ConversationList from "@/components/chat/ConversationList";
import ChatThread from "@/components/chat/ChatThread";
import ChatComposer from "@/components/chat/ChatComposer";
import ConversationInfoPanel from "@/components/chat/ConversationInfoPanel";
import { useSearchParams } from "next/navigation";
import { Users, MessageSquare } from "lucide-react";

type Props = { role?: "teacher" | "student" | "parent" };

export default function MessagesPage({ role = "teacher" }: Props) {
  const { conversations, isLoading, refresh } = useConversations();
  const params = useSearchParams();
  const preselect = params?.get("open");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isParticipantPanelOpen, setIsParticipantPanelOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<MessageDTO | null>(null);

  useEffect(() => {
    if (preselect) setSelectedId(preselect);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselect]);

  const selected = useMemo(() => conversations.find((c) => c.id === selectedId) || null, [conversations, selectedId]);
  const { messages, refresh: refreshMessages } = useMessages(selectedId || undefined);

  const contextStudent =
    selected && selected.contextStudentId
      ? selected.participants.find((p) => p.userId === selected.contextStudentId) ||
        selected.participants.find((p) => p.role === "STUDENT") ||
        null
      : null;

  const typeLabel =
    selected?.type === "TRIAD"
      ? "Nhóm GV - HS - PH"
      : selected?.type === "GROUP"
      ? "Nhóm nhiều người"
      : "Trao đổi riêng";

  const handleSelect = async (id: string) => {
    setSelectedId(id);
    try {
      await markRead(id);
      await refresh();
    } catch (e) {
      console.error("[MessagesPage] markRead error", e);
    }
  };

  const onSent = async () => {
    await refreshMessages();
    await refresh();
  };

  const colorKey: "green" | "blue" | "amber" = role === "student" ? "green" : role === "parent" ? "amber" : "blue";
  const palette = {
    listContainerBg: {
      green: "bg-gradient-to-b from-green-50/50 to-emerald-50/30",
      blue: "bg-gradient-to-b from-blue-50/50 to-indigo-50/30",
      amber: "bg-gradient-to-b from-amber-50/50 to-orange-50/30",
    }[colorKey],
    listBorder: {
      green: "border-green-100",
      blue: "border-blue-100",
      amber: "border-amber-100",
    }[colorKey],
    listHeaderBg: {
      green: "bg-gradient-to-r from-green-50/70 to-emerald-50/50",
      blue: "bg-gradient-to-r from-blue-50/70 to-indigo-50/50",
      amber: "bg-gradient-to-r from-amber-50/70 to-orange-50/50",
    }[colorKey],
    labelText: {
      green: "text-green-700",
      blue: "text-blue-700",
      amber: "text-amber-700",
    }[colorKey],
    mainBg: {
      green: "bg-gradient-to-b from-green-50/40 to-emerald-50/20",
      blue: "bg-gradient-to-b from-blue-50/40 to-indigo-50/20",
      amber: "bg-gradient-to-b from-amber-50/40 to-orange-50/20",
    }[colorKey],
    stickyHeaderBg: {
      green: "bg-gradient-to-r from-green-50/90 to-emerald-50/70",
      blue: "bg-gradient-to-r from-blue-50/90 to-indigo-50/70",
      amber: "bg-gradient-to-r from-amber-50/90 to-orange-50/70",
    }[colorKey],
    stickyHeaderBorder: {
      green: "border-green-200",
      blue: "border-blue-200",
      amber: "border-amber-200",
    }[colorKey],
    toggleBtnActive: {
      green: "bg-green-100 text-green-600",
      blue: "bg-blue-100 text-blue-600",
      amber: "bg-amber-100 text-amber-600",
    }[colorKey],
    toggleBtnHover: {
      green: "hover:bg-green-50",
      blue: "hover:bg-blue-50",
      amber: "hover:bg-amber-50",
    }[colorKey],
    composerBorder: {
      green: "border-green-200",
      blue: "border-blue-200",
      amber: "border-amber-200",
    }[colorKey],
    emptyText: {
      green: "text-green-700",
      blue: "text-blue-700",
      amber: "text-amber-700",
    }[colorKey],
  };

  return (
    <div className="flex h-full min-h-0 text-sm text-gray-800 overflow-hidden">
      {/* Conversation List */}
      <div className={`w-[300px] md:w-[320px] lg:w-[360px] xl:w-[380px] ${palette.listContainerBg} border-r ${palette.listBorder} flex flex-col min-h-0 overflow-hidden shrink-0`}>
        <div className={`p-4 border-b ${palette.listBorder} ${palette.listHeaderBg}`}>
          <div className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare
              className={`h-5 w-5 ${colorKey === "green" ? "text-green-600" : colorKey === "blue" ? "text-blue-600" : "text-amber-600"}`}
              aria-hidden="true"
            />
            <span>Tin nhắn</span>
          </div>
          <p className={`text-xs ${palette.labelText} mt-1 font-medium`}>
            {role === "teacher" ? "Giáo viên" : role === "student" ? "Học sinh" : "Phụ huynh"}
          </p>
        </div>
        {isLoading ? (
          <div className="p-4 text-sm text-gray-500">Đang tải...</div>
        ) : (
          <ConversationList color={colorKey} items={conversations} selectedId={selectedId} onSelect={handleSelect} />
        )}
      </div>

      {/* Main Chat Area (scroller) */}
      <div className={`flex-1 flex flex-col ${palette.mainBg} min-h-0 overflow-y-auto overflow-x-hidden`}>
        {selected ? (
          <>
            {/* Chat Header */}
            <div className={`sticky top-0 z-20 p-4 ${palette.stickyHeaderBg} backdrop-blur supports-[backdrop-filter]:bg-white/80 border-b ${palette.stickyHeaderBorder} flex justify-between items-center min-w-0`}>
              <div className="min-w-0 flex-1">
                <div className="text-base font-bold text-gray-900 truncate">
                  {selected.participants.map((p) => p.fullname).join(", ")}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-gray-500">
                  <span>{typeLabel}</span>
                  {contextStudent && (
                    <span className="flex items-center min-w-0">
                      <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${colorKey === "green" ? "bg-green-300" : colorKey === "blue" ? "bg-blue-300" : "bg-amber-300"} flex-shrink-0`}></span>
                      Về học sinh: <span className="font-semibold ml-1 truncate">{contextStudent.fullname}</span>
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setIsParticipantPanelOpen(!isParticipantPanelOpen)}
                className={`p-2 rounded-full transition-colors ${
                  isParticipantPanelOpen
                    ? colorKey === "green"
                      ? "bg-green-100 text-green-600"
                      : colorKey === "blue"
                      ? "bg-blue-100 text-blue-600"
                      : "bg-amber-100 text-amber-600"
                    : colorKey === "green"
                    ? "hover:bg-green-50"
                    : colorKey === "blue"
                    ? "hover:bg-blue-50"
                    : "hover:bg-amber-50"
                }`}
                title="Thông tin hội thoại"
              >
                <Users className="h-5 w-5" />
              </button>
            </div>

            {/* Chat Thread và Composer */}
            <div className="flex-1 flex min-h-0 min-w-0 overflow-visible">
              <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-visible">
                <ChatThread
                  color={colorKey}
                  messages={messages}
                  participants={selected.participants}
                  onReply={setReplyingTo}
                  selfUserId={selected.self.userId}
                />
                <div className={`sticky bottom-0 z-20 ${palette.stickyHeaderBg} backdrop-blur supports-[backdrop-filter]:bg-white/80 border-t ${palette.composerBorder}`}>
                  <ChatComposer
                    color={colorKey}
                    conversationId={selectedId}
                    onSent={onSent}
                    replyingTo={replyingTo}
                    onCancelReply={() => setReplyingTo(null)}
                  />
                </div>
              </div>

              {/* Participant Panel (Sliding Sidebar) */}
              <div
                className={`hidden lg:flex transition-all duration-300 ease-in-out ${palette.listContainerBg} border-l ${palette.listBorder} flex-col min-h-0 min-w-0 shrink-0 ${
                  isParticipantPanelOpen ? "w-[300px] overflow-hidden" : "w-0 overflow-hidden"
                }`}
              >
                {isParticipantPanelOpen && <ConversationInfoPanel color={colorKey} conversation={selected} />}
              </div>
            </div>
          </>
        ) : (
          <div className={`flex-1 flex items-center justify-center text-base ${palette.emptyText} ${palette.mainBg}`}>
            Chọn một hội thoại để bắt đầu nhắn tin
          </div>
        )}
      </div>
    </div>
  );
}
