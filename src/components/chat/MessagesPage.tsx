"use client";

import { useEffect, useMemo, useState } from "react";
import { useConversations, useMessages, markRead } from "@/hooks/use-chat";
import ConversationList from "@/components/chat/ConversationList";
import ChatThread from "@/components/chat/ChatThread";
import ChatComposer from "@/components/chat/ChatComposer";
import ParticipantPanel from "@/components/chat/ParticipantPanel";
import { useSearchParams } from "next/navigation";

type Props = { role?: "teacher" | "student" | "parent" };

export default function MessagesPage({ role = "teacher" }: Props) {
  const { conversations, isLoading, refresh } = useConversations();
  const params = useSearchParams();
  const preselect = params?.get("open");
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
    <div className="p-4 h-full">
      <div className="grid grid-cols-12 gap-4 h-[calc(100vh-140px)]">
        <div className="col-span-12 lg:col-span-3 bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col">
          <div className="p-3 border-b border-gray-100">
            <div className="text-lg font-semibold">Tin nhắn</div>
            <p className="text-xs text-gray-500">{role === "teacher" ? "Giáo viên" : role === "student" ? "Học sinh" : "Phụ huynh"}</p>
          </div>
          {isLoading ? (
            <div className="p-4 text-sm text-gray-500">Đang tải...</div>
          ) : (
            <ConversationList items={conversations} selectedId={selectedId} onSelect={handleSelect} />
          )}
        </div>
        <div className="col-span-12 lg:col-span-6 bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col">
          <div className="p-3 border-b border-gray-100">
            {selected ? (
              <>
                <div className="text-lg font-semibold truncate">
                  {selected.participants.map((p) => p.fullname).join(", ")}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-medium">{typeLabel}</span>
                  {contextStudent && (
                    <span>
                      Về học sinh: <span className="font-semibold">{contextStudent.fullname}</span>
                    </span>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="text-lg font-semibold">Chọn hội thoại</div>
                <p className="text-xs text-gray-500">Hãy chọn hoặc tạo hội thoại để bắt đầu</p>
              </>
            )}
          </div>
          {selected ? (
            <>
              <ChatThread messages={messages} participants={selected.participants} />
              <ChatComposer conversationId={selectedId} onSent={onSent} />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-500">Chưa chọn hội thoại</div>
          )}
        </div>
        <div className="col-span-12 lg:col-span-3 bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <ParticipantPanel conversation={selected || null} />
        </div>
      </div>
    </div>
  );
}
