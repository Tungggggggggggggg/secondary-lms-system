"use client";

import React from "react";
import type { ConversationItem } from "@/hooks/use-chat";

type Props = {
  conversation?: ConversationItem | null;
};

export default function ParticipantPanel({ conversation }: Props) {
  if (!conversation) {
    return (
      <div className="h-full p-4 text-sm text-gray-500">Chọn một hội thoại để xem thông tin người tham gia</div>
    );
  }
  return (
    <div className="h-full p-4 space-y-3">
      <div>
        <h3 className="font-semibold text-gray-800">Người tham gia</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {conversation.participants.map((p) => (
            <span key={p.userId} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-gray-200 shadow-sm">
              <span className="text-lg">👤</span>
              <span className="text-sm font-medium">{p.fullname}</span>
              <span className="text-xs text-gray-500 capitalize">{p.role.toLowerCase()}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="text-xs text-gray-500">
        Loại: <span className="font-medium">{conversation.type}</span>
      </div>
    </div>
  );
}
