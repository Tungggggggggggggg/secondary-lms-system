"use client";

"use client";

import { useEffect, useMemo, useState } from "react";
import { useConversations, useMessages, markRead, MessageDTO } from "@/hooks/use-chat";
import ConversationList from "@/components/chat/ConversationList";
import ChatThread from "@/components/chat/ChatThread";
import ChatComposer from "@/components/chat/ChatComposer";
import ConversationInfoPanel from "@/components/chat/ConversationInfoPanel";
import { useSearchParams } from "next/navigation";
import { Users } from "lucide-react";

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

  return (
    <div className="flex h-full min-h-0 text-sm text-gray-800 overflow-hidden">
      {/* Conversation List */}
      <div className="w-[300px] md:w-[320px] lg:w-[360px] xl:w-[380px] bg-gradient-to-b from-amber-50/50 to-orange-50/30 border-r border-amber-100 flex flex-col min-h-0 overflow-hidden shrink-0">
        <div className="p-4 border-b border-amber-100 bg-gradient-to-r from-amber-50/70 to-orange-50/50">
          <div className="text-lg font-bold text-amber-900">💬 Tin nhắn</div>
          <p className="text-xs text-amber-700 mt-1 font-medium">
            {role === "teacher" ? "Giáo viên" : role === "student" ? "Học sinh" : "Phụ huynh"}
          </p>
        </div>
        {isLoading ? (
          <div className="p-4 text-sm text-gray-500">Đang tải...</div>
        ) : (
          <ConversationList items={conversations} selectedId={selectedId} onSelect={handleSelect} />
        )}
      </div>

      {/* Main Chat Area (scroller) */}
      <div className="flex-1 flex flex-col bg-gradient-to-b from-amber-50/40 to-orange-50/20 min-h-0 overflow-y-auto overflow-x-hidden">
        {selected ? (
          <>
            {/* Chat Header */}
            <div className="sticky top-0 z-20 p-4 bg-gradient-to-r from-amber-50/90 to-orange-50/70 backdrop-blur supports-[backdrop-filter]:bg-white/80 border-b border-amber-200 flex justify-between items-center min-w-0">
              <div className="min-w-0 flex-1">
                <div className="text-base font-bold text-gray-900 truncate">
                  {selected.participants.map((p) => p.fullname).join(", ")}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-gray-500">
                  <span>{typeLabel}</span>
                  {contextStudent && (
                    <span className="flex items-center min-w-0">
                      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-amber-300 flex-shrink-0"></span>
                      Về học sinh: <span className="font-semibold ml-1 truncate">{contextStudent.fullname}</span>
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setIsParticipantPanelOpen(!isParticipantPanelOpen)}
                className={`p-2 rounded-full transition-colors ${
                  isParticipantPanelOpen ? "bg-amber-100 text-amber-600" : "hover:bg-amber-50"
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
                  messages={messages}
                  participants={selected.participants}
                  onReply={setReplyingTo}
                  selfUserId={selected.self.userId}
                />
                <div className="sticky bottom-0 z-20 bg-gradient-to-r from-amber-50/90 to-orange-50/70 backdrop-blur supports-[backdrop-filter]:bg-white/80 border-t border-amber-200">
                  <ChatComposer
                    conversationId={selectedId}
                    onSent={onSent}
                    replyingTo={replyingTo}
                    onCancelReply={() => setReplyingTo(null)}
                  />
                </div>
              </div>

              {/* Participant Panel (Sliding Sidebar) */}
              <div
                className={`hidden lg:flex transition-all duration-300 ease-in-out bg-gradient-to-b from-amber-50/50 to-orange-50/30 border-l border-amber-100 flex-col min-h-0 min-w-0 shrink-0 ${
                  isParticipantPanelOpen ? "w-[300px] overflow-hidden" : "w-0 overflow-hidden"
                }`}
              >
                {isParticipantPanelOpen && <ConversationInfoPanel conversation={selected} />}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-base text-amber-700 bg-gradient-to-b from-amber-50/40 to-orange-50/20">
            Chọn một hội thoại để bắt đầu nhắn tin
          </div>
        )}
      </div>
    </div>
  );
}
