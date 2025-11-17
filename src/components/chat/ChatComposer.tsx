"use client";

import { useEffect, useRef, useState } from "react";
import { sendMessage } from "@/hooks/use-chat";

type Props = {
  conversationId?: string | null;
  onSent?: () => void;
};

export default function ChatComposer({ conversationId, onSent }: Props) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, [conversationId]);

  const doSend = async () => {
    if (!conversationId) return;
    const content = value.trim();
    if (!content) return;
    try {
      setSending(true);
      await sendMessage(conversationId, content);
      setValue("");
      onSent?.();
    } catch (e) {
      console.error("[ChatComposer] send error", e);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border-t border-gray-200 p-3 bg-white rounded-b-xl">
      <div className="flex items-end gap-2">
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              doSend();
            }
          }}
          placeholder="Nhập tin nhắn... (Enter để gửi, Shift+Enter để xuống dòng)"
          className="flex-1 resize-none rounded-xl border border-gray-200 p-3 min-h-[44px] max-h-40 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={doSend}
          disabled={!value.trim() || !conversationId || sending}
          className="h-11 px-4 rounded-xl bg-indigo-600 text-white font-semibold shadow hover:bg-indigo-700 disabled:opacity-50"
        >
          Gửi
        </button>
      </div>
    </div>
  );
}
