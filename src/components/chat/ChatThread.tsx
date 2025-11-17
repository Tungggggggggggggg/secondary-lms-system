"use client";

import { useEffect, useRef } from "react";
import type { MessageDTO } from "@/hooks/use-chat";
import { useSession } from "next-auth/react";

type Props = {
  messages: MessageDTO[];
};

export default function ChatThread({ messages }: Props) {
  const { data: session } = useSession();
  const me = (session?.user as any)?.id as string | undefined;
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-gradient-to-br from-white to-indigo-50/40 rounded-xl border border-gray-200">
      {messages.map((m) => {
        const mine = me && m.senderId === me;
        return (
          <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
            <div className={`${mine ? "bg-indigo-600 text-white" : "bg-white text-gray-800"} rounded-2xl px-3 py-2 shadow max-w-[75%]`}>{m.content}</div>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}
