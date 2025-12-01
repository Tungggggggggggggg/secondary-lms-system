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
    <div className="flex h-full text-sm text-gray-800 overflow-hidden">
      {/* Conversation List */}
      <div className="w-full lg:w-[380px] bg-gray-50 border-r border-gray-200 flex flex-col min-h-0">
        <div className="p-4 border-b border-gray-200">
          <div className="text-lg font-bold text-gray-900">Tin nhắn</div>
          <p className="text-xs text-gray-500 mt-1">
            {role === "teacher" ? "Giáo viên" : role === "student" ? "Học sinh" : "Phụ huynh"}
          </p>
        </div>
        {isLoading ? (
          <div className="p-4 text-sm text-gray-500">Đang tải...</div>
        ) : (
          <ConversationList items={conversations} selectedId={selectedId} onSelect={handleSelect} />
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white min-h-0">
        {selected ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <div className="text-base font-bold text-gray-900 truncate">
                  {selected.participants.map((p) => p.fullname).join(", ")}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-gray-500">
                  <span>{typeLabel}</span>
                  {contextStudent && (
                    <span className="flex items-center">
                      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-gray-300"></span>
                      Về học sinh: <span className="font-semibold ml-1">{contextStudent.fullname}</span>
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setIsParticipantPanelOpen(!isParticipantPanelOpen)}
                className={`p-2 rounded-full transition-colors ${
                  isParticipantPanelOpen ? "bg-indigo-100 text-indigo-600" : "hover:bg-gray-100"
                }`}
                title="Thông tin hội thoại"
              >
                <Users className="h-5 w-5" />
              </button>
            </div>

            {/* Chat Thread and Composer */}
            <div className="flex-1 flex min-h-0 overflow-hidden">
              <div className="flex-1 flex flex-col min-w-0 min-h-0">
                <ChatThread
                  messages={messages}
                  participants={selected.participants}
                  onReply={setReplyingTo}
                  selfUserId={selected.self.userId}
                />
                <ChatComposer
                  conversationId={selectedId}
                  onSent={onSent}
                  replyingTo={replyingTo}
                  onCancelReply={() => setReplyingTo(null)}
                />
              </div>

              {/* Participant Panel (Sliding Sidebar) */}
              <div
                className={`transition-all duration-300 ease-in-out bg-white border-l border-gray-200 overflow-hidden flex flex-col min-h-0 ${
                  isParticipantPanelOpen ? "w-full lg:w-[320px]" : "w-0"
                }`}
              >
                {isParticipantPanelOpen && <ConversationInfoPanel conversation={selected} />}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-base text-gray-500 bg-gray-50">
            Chọn một hội thoại để bắt đầu nhắn tin
          </div>
        )}
      </div>
    </div>
  );
}
