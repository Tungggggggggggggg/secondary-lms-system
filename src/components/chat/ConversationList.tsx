"use client";

import React from "react";
import { ConversationItem } from "@/hooks/use-chat";

type Props = {
  items: ConversationItem[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
};

export default function ConversationList({ items, selectedId, onSelect }: Props) {
  return (
    <div className="h-full overflow-y-auto p-3 space-y-2">
      {items.length === 0 && (
        <div className="text-sm text-gray-500 p-4">Chưa có hội thoại nào</div>
      )}
      {items.map((c) => {
        const active = c.id === selectedId;
        const title = c.participants.map((p) => p.fullname).join(", ");
        const last = c.lastMessage?.content || "";
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
            className={`w-full text-left rounded-xl px-3 py-2 transition ${
              active ? "bg-indigo-50 border border-indigo-200" : "hover:bg-gray-50 border border-transparent"
            }`}
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
      })}
    </div>
  );
}
