"use client";

import React from "react";
import { ConversationItem } from "@/hooks/use-chat";
import { cn } from "@/lib/utils";
import Avatar from "@/components/ui/avatar";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { Search } from "lucide-react";

type Props = {
  items: ConversationItem[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
};

export default function ConversationList({ items, selectedId, onSelect }: Props) {
  const { data: session } = useSession();
  const me = (session?.user as any)?.id as string | undefined;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (query.length < 3) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    const debounce = setTimeout(() => {
      setIsSearching(true);
      fetch(`/api/chat/search?q=${query}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setResults(data.data);
          }
        })
        .finally(() => setIsSearching(false));
    }, 500);

    return () => clearTimeout(debounce);
  }, [query]);

  const renderConversationItem = (c: ConversationItem) => {
    const otherParticipants = c.participants.filter((p) => p.userId !== me);
    const title = otherParticipants.map((p) => p.fullname).join(", ");
    const last = c.lastMessage ? `${c.lastMessage.senderId === me ? "Bạn: " : ""}${c.lastMessage.content}` : "Chưa có tin nhắn";
    const active = selectedId === c.id;
    const contextStudent =
      c.contextStudentId
        ? c.participants.find((p) => p.userId === c.contextStudentId) ||
          c.participants.find((p) => p.role === "STUDENT") ||
          null
        : null;
    const typeLabel =
      c.type === "TRIAD"
        ? "GV - HS - PH"
        : c.type === "GROUP"
        ? "Nhóm"
        : "Riêng";

    return (
      <button
        key={c.id}
        onClick={() => onSelect(c.id)}
        className={`w-full text-left rounded-xl px-3 py-2 transition ${active ? "bg-indigo-100 border-indigo-200" : "hover:bg-white border-gray-200"}`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="font-semibold text-gray-800 truncate mr-2">{title}</div>
            {contextStudent && (
              <div className="text-[11px] text-indigo-600 mt-0.5 truncate">
                Về học sinh: <span className="font-semibold">{contextStudent.fullname}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-[11px] text-gray-600 font-medium">
              {typeLabel}
            </span>
            {c.unreadCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center min-w-[1.5rem] h-6 text-xs font-bold bg-red-500 text-white rounded-full px-2">
                {c.unreadCount}
              </span>
            )}
          </div>
        </div>
        <div className="text-xs text-gray-500 truncate mt-1">{last}</div>
      </button>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm tin nhắn..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-full bg-gray-100 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-2 scrollbar-hover overscroll-contain">
        {query.length >= 3 ? (
          <div>
            {isSearching ? (
              <p className="text-center text-gray-500 p-4">Đang tìm...</p>
            ) : results.length > 0 ? (
              results.map(result => (
                <div key={result.id} onClick={() => onSelect(result.conversationId)} className="p-2 rounded-lg hover:bg-gray-100 cursor-pointer">
                  <p className="text-xs text-gray-500 truncate">{result.conversationName}</p>
                  <p className="font-semibold text-sm truncate">{result.senderName}: <span className="font-normal opacity-80">{result.content}</span></p>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 p-4">Không tìm thấy kết quả.</p>
            )}
          </div>
        ) : (
          items.length > 0 ? items.map(renderConversationItem) : <div className="text-sm text-gray-500 p-4">Chưa có hội thoại nào</div>
        )}
      </div>
    </div>
  );
}
