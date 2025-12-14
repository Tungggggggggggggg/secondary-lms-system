"use client";

import { useMemo, useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import RateLimitDialog, { getRetryAfterSecondsFromResponse } from "@/components/shared/RateLimitDialog";

type ChatMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; sources?: Array<{ lessonId: string; chunkIndex: number; distance: number; excerpt: string }> };

export default function LessonTutorChat(props: { classId: string; lessonId: string }) {
  const { classId, lessonId } = props;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [rateLimitOpen, setRateLimitOpen] = useState(false);
  const [rateLimitRetryAfterSeconds, setRateLimitRetryAfterSeconds] = useState(0);

  const lastUserMessage = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]?.role === "user") return messages[i] as { role: "user"; content: string };
    }
    return null;
  }, [messages]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || loading) return;

    const history = messages
      .slice(-20)
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, { role: "user", content }]);
    setInput("");

    try {
      setLoading(true);
      const res = await fetch("/api/ai/tutor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId, lessonId, message: content, history }),
      });

      const json = (await res.json().catch(() => null)) as unknown;

      if (res.status === 429) {
        const retryAfter = getRetryAfterSecondsFromResponse(res, json) ?? 30;
        setRateLimitRetryAfterSeconds(retryAfter);
        setRateLimitOpen(true);
        return;
      }

      const ok =
        typeof json === "object" &&
        json !== null &&
        (json as { success?: unknown }).success === true;

      if (!res.ok || !ok) {
        const msg =
          typeof json === "object" &&
          json !== null &&
          typeof (json as { message?: unknown }).message === "string"
            ? (json as { message: string }).message
            : res.statusText;
        throw new Error(msg);
      }

      const data = (json as { data?: unknown }).data;
      const answer =
        typeof data === "object" &&
        data !== null &&
        typeof (data as { answer?: unknown }).answer === "string"
          ? (data as { answer: string }).answer
          : "";

      const sourcesRaw =
        typeof data === "object" &&
        data !== null &&
        Array.isArray((data as { sources?: unknown }).sources)
          ? ((data as { sources: unknown[] }).sources as unknown[])
          : [];

      const sources = sourcesRaw
        .map((s) => {
          if (!s || typeof s !== "object") return null;
          const lessonId = typeof (s as { lessonId?: unknown }).lessonId === "string" ? (s as { lessonId: string }).lessonId : null;
          const chunkIndex = typeof (s as { chunkIndex?: unknown }).chunkIndex === "number" ? (s as { chunkIndex: number }).chunkIndex : null;
          const distance = typeof (s as { distance?: unknown }).distance === "number" ? (s as { distance: number }).distance : null;
          const excerpt = typeof (s as { excerpt?: unknown }).excerpt === "string" ? (s as { excerpt: string }).excerpt : "";
          if (!lessonId || chunkIndex === null || distance === null) return null;
          return { lessonId, chunkIndex, distance, excerpt };
        })
        .filter((v): v is { lessonId: string; chunkIndex: number; distance: number; excerpt: string } => v !== null);

      setMessages((prev) => [...prev, { role: "assistant", content: answer || "(Không có phản hồi)", sources }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Có lỗi xảy ra";
      setMessages((prev) => [...prev, { role: "assistant", content: `Không thể trả lời lúc này: ${msg}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <RateLimitDialog
        open={rateLimitOpen}
        onOpenChange={setRateLimitOpen}
        retryAfterSeconds={rateLimitRetryAfterSeconds}
        onRetry={async () => {
          if (lastUserMessage) {
            await send(lastUserMessage.content);
          }
        }}
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="text-sm font-semibold text-slate-800">Trợ lý AI (RAG Tutor)</div>
        <div className="text-xs text-slate-600">
          Trợ lý sẽ trả lời dựa trên nội dung bài học đã được hệ thống index.
        </div>

        <div className="space-y-3">
          {messages.length === 0 ? (
            <div className="text-sm text-slate-500">
              Hãy đặt câu hỏi về bài học (ví dụ: "Tóm tắt ý chính", "Giải thích khái niệm X").
            </div>
          ) : (
            messages.map((m, idx) => (
              <div key={idx} className={m.role === "user" ? "text-right" : "text-left"}>
                <div
                  className={
                    m.role === "user"
                      ? "inline-block rounded-2xl bg-green-600 text-white px-3 py-2 text-sm max-w-[90%]"
                      : "inline-block rounded-2xl bg-slate-100 text-slate-900 px-3 py-2 text-sm max-w-[90%]"
                  }
                >
                  {m.content}
                </div>

                {m.role === "assistant" && m.sources && m.sources.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {m.sources.slice(0, 5).map((s) => (
                      <Badge key={`${s.lessonId}-${s.chunkIndex}`} variant="outline">
                        Lesson {s.lessonId}#{s.chunkIndex}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="flex items-end gap-2 pt-2 border-t border-slate-200">
          <TextareaAutosize
            minRows={2}
            maxRows={6}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Nhập câu hỏi..."
            className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <Button
            onClick={() => void send(input)}
            disabled={loading || !input.trim()}
            className="shrink-0"
          >
            {loading ? "Đang gửi..." : "Gửi"}
          </Button>
        </div>
      </div>
    </div>
  );
}
