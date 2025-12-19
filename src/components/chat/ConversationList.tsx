"use client";

import React from "react";
import { ConversationItem } from "@/hooks/use-chat";
import { cn } from "@/lib/utils";
import Avatar from "@/components/ui/avatar";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { Search } from "lucide-react";

type SearchResultItem = {
  id: string;
  conversationId: string;
  conversationName: string;
  senderName: string;
  content: string;
};

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

function isSearchResultItem(value: unknown): value is SearchResultItem {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.conversationId === "string" &&
    typeof value.conversationName === "string" &&
    typeof value.senderName === "string" &&
    typeof value.content === "string"
  );
}

type Props = {
  color?: "green" | "blue" | "amber";
  items: ConversationItem[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
};

export default function ConversationList({ color = "amber", items, selectedId, onSelect }: Props) {
  const { data: session } = useSession();
  const me = getSessionUserId(session);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (query.length < 3) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    let cancelled = false;

    const debounce = setTimeout(() => {
      setIsSearching(true);
      fetch(`/api/chat/search?q=${encodeURIComponent(query)}`)
        .then((res) => res.json() as Promise<unknown>)
        .then((raw) => {
          if (cancelled) return;
          if (!isRecord(raw) || raw.success !== true || !Array.isArray(raw.data)) {
            setResults([]);
            return;
          }
          setResults(raw.data.filter(isSearchResultItem));
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setIsSearching(false);
        });
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(debounce);
    };
  }, [query]);

  const palette = {
    headerBorder: color === "green" ? "border-green-100" : color === "blue" ? "border-blue-100" : "border-amber-100",
    searchIcon: color === "green" ? "text-green-400" : color === "blue" ? "text-blue-400" : "text-amber-400",
    inputBorder: color === "green" ? "border-green-200" : color === "blue" ? "border-blue-200" : "border-amber-200",
    inputBg: color === "green" ? "bg-green-50/50" : color === "blue" ? "bg-blue-50/50" : "bg-amber-50/50",
    inputRing: color === "green" ? "focus:ring-green-500" : color === "blue" ? "focus:ring-blue-500" : "focus:ring-amber-500",
    inputPlaceholder: color === "green" ? "placeholder-green-600/50" : color === "blue" ? "placeholder-blue-600/50" : "placeholder-amber-600/50",
    itemActive: color === "green" ? "bg-green-100 border-green-300" : color === "blue" ? "bg-blue-100 border-blue-300" : "bg-amber-100 border-amber-300",
    itemHover: color === "green" ? "hover:bg-green-50/50 hover:border-green-200" : color === "blue" ? "hover:bg-blue-50/50 hover:border-blue-200" : "hover:bg-amber-50/50 hover:border-amber-200",
    itemBorderBase: color === "green" ? "border-green-100/50" : color === "blue" ? "border-blue-100/50" : "border-amber-100/50",
    itemRing: color === "green" ? "focus-visible:ring-green-400" : color === "blue" ? "focus-visible:ring-blue-400" : "focus-visible:ring-amber-400",
    labelText: color === "green" ? "text-green-700" : color === "blue" ? "text-blue-700" : "text-amber-700",
    badgeBg: color === "green" ? "bg-green-100/70" : color === "blue" ? "bg-blue-100/70" : "bg-amber-100/70",
    badgeText: color === "green" ? "text-green-700" : color === "blue" ? "text-blue-700" : "text-amber-700",
    unreadBg: color === "green" ? "bg-green-600" : color === "blue" ? "bg-blue-600" : "bg-amber-600",
  };

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
        type="button"
        onClick={() => onSelect(c.id)}
        className={`w-full text-left rounded-xl px-3 py-2 transition border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${palette.itemRing} ${active ? `${palette.itemActive} shadow-md` : `${palette.itemBorderBase} ${palette.itemHover}`}`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className={`font-semibold text-gray-900 truncate mr-2`}>{title}</div>
            {contextStudent && (
              <div className={`text-[11px] ${palette.labelText} mt-0.5 truncate font-medium`}>
                Về học sinh: <span className="font-semibold">{contextStudent.fullname}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`px-2 py-0.5 rounded-full ${palette.badgeBg} text-[11px] ${palette.badgeText} font-medium`}>
              {typeLabel}
            </span>
            {c.unreadCount > 0 && (
              <span className={`ml-1 inline-flex items-center justify-center min-w-[1.5rem] h-6 text-xs font-bold ${palette.unreadBg} text-white rounded-full px-2`}>
                {c.unreadCount}
              </span>
            )}
          </div>
        </div>
        <div className="text-xs text-gray-600 truncate mt-1">{last}</div>
      </button>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className={`p-3 border-b ${palette.headerBorder}`}>
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${palette.searchIcon}`} />
          <input
            type="text"
            placeholder="Tìm kiếm tin nhắn..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={`w-full pl-9 pr-4 py-2 text-sm border ${palette.inputBorder} rounded-full ${palette.inputBg} focus:bg-white focus:ring-2 ${palette.inputRing} outline-none transition-all text-gray-900 ${palette.inputPlaceholder}`}
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-2 scrollbar-hover overscroll-contain">
        {query.length >= 3 ? (
          <div>
            {isSearching ? (
              <p className={`text-center ${palette.labelText} p-4 font-medium`}>Đang tìm...</p>
            ) : results.length > 0 ? (
              results.map(result => (
                <button
                  key={result.id}
                  type="button"
                  onClick={() => onSelect(result.conversationId)}
                  className={`w-full text-left p-2 rounded-lg transition-colors border border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${palette.itemRing} ${palette.itemHover}`}
                >
                  <p className={`text-xs ${palette.labelText} truncate font-medium`}>{result.conversationName}</p>
                  <p className="font-semibold text-sm truncate text-gray-900">{result.senderName}: <span className="font-normal opacity-80">{result.content}</span></p>
                </button>
              ))
            ) : (
              <p className={`text-center ${palette.labelText} p-4 font-medium`}>Không tìm thấy kết quả.</p>
            )}
          </div>
        ) : (
          items.length > 0 ? items.map(renderConversationItem) : <div className={`text-sm ${palette.labelText} p-4 font-medium`}>Chưa có hội thoại nào</div>
        )}
      </div>
    </div>
  );
}
