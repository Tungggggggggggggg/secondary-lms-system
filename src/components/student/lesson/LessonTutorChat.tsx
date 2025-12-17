"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import RateLimitDialog, { getRetryAfterSecondsFromResponse } from "@/components/shared/RateLimitDialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type ChatMessage =
  | { role: "user"; content: string }
  | {
      role: "assistant";
      content: string;
      sources?: Array<{
        lessonId: string;
        chunkIndex: number;
        distance: number;
        excerpt: string;
        content?: string;
        lessonTitle?: string | null;
      }>;
    };

type ChatSource = {
  lessonId: string;
  chunkIndex: number;
  distance: number;
  excerpt: string;
  content: string;
  lessonTitle: string | null;
};

function sanitizeAssistantContent(text: string): string {
  // Xóa các đoạn đánh dấu nội bộ dạng (Lesson xxx#y) để học sinh không thấy ID
  let result = text.replace(/\(\s*Lesson [^)]+\)/gi, "");

  // Thêm xuống dòng trước các mục lớn dạng "**Tiêu đề:**" để dễ đọc
  result = result.replace(/\s*\*\*(.+?)\*\*:/g, "\n\n**$1**:");

  // Các bullet từ nguồn thường có dạng "* **Tiêu đề**" -> chuyển thành dòng mới bắt đầu bằng "•"
  result = result.replace(/\*\s+\*\*/g, "\n• **");

  // Chuẩn hoá: không cho quá 2 dòng trống liên tiếp
  result = result.replace(/\n{3,}/g, "\n\n");

  // Gom bớt khoảng trắng thừa (nhưng giữ xuống dòng)
  result = result
    .split(/\n/)
    .map((line) => line.replace(/\s{2,}/g, " ").trimEnd())
    .join("\n");

  return result.trim();
}

export default function LessonTutorChat(props: { classId: string; lessonId: string }) {
  const { classId, lessonId } = props;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [noEmbeddings, setNoEmbeddings] = useState(false);

  const hydratedRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);
  const storageKey = useMemo(() => `lesson:tutorChat:${classId}:${lessonId}`, [classId, lessonId]);

  useEffect(() => {
    hydratedRef.current = false;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setMessages([]);
        setNoEmbeddings(false);
        hydratedRef.current = true;
        return;
      }

      const parsed = JSON.parse(raw) as unknown;
      const msgList =
        typeof parsed === "object" &&
        parsed !== null &&
        Array.isArray((parsed as { messages?: unknown }).messages)
          ? ((parsed as { messages: unknown[] }).messages as unknown[])
          : [];

      const nextMessages: ChatMessage[] = msgList
        .map((m) => {
          if (!m || typeof m !== "object") return null;
          const role = (m as { role?: unknown }).role;
          const content = (m as { content?: unknown }).content;
          if (role !== "user" && role !== "assistant") return null;
          if (typeof content !== "string") return null;

          if (role === "user") {
            return { role: "user", content } as ChatMessage;
          }

          const sourcesRaw = (m as { sources?: unknown }).sources;
          const sources = Array.isArray(sourcesRaw)
            ? sourcesRaw
                .map((s) => {
                  if (!s || typeof s !== "object") return null;
                  const lessonId = typeof (s as { lessonId?: unknown }).lessonId === "string" ? (s as { lessonId: string }).lessonId : null;
                  const chunkIndex = typeof (s as { chunkIndex?: unknown }).chunkIndex === "number" ? (s as { chunkIndex: number }).chunkIndex : null;
                  const distance = typeof (s as { distance?: unknown }).distance === "number" ? (s as { distance: number }).distance : null;
                  const excerpt = typeof (s as { excerpt?: unknown }).excerpt === "string" ? (s as { excerpt: string }).excerpt : "";
                  const content = typeof (s as { content?: unknown }).content === "string" ? (s as { content: string }).content : "";
                  const lessonTitle =
                    (s as { lessonTitle?: unknown }).lessonTitle === null
                      ? null
                      : typeof (s as { lessonTitle?: unknown }).lessonTitle === "string"
                      ? (s as { lessonTitle: string }).lessonTitle
                      : null;
                  if (!lessonId || chunkIndex === null || distance === null) return null;
                  return { lessonId, chunkIndex, distance, excerpt, content, lessonTitle };
                })
                .filter(
                  (v): v is { lessonId: string; chunkIndex: number; distance: number; excerpt: string; content: string; lessonTitle: string | null } =>
                    v !== null
                )
            : undefined;

          return { role: "assistant", content, sources } as ChatMessage;
        })
        .filter((v): v is ChatMessage => v !== null);

      const noEmbeddingsStored =
        typeof parsed === "object" &&
        parsed !== null &&
        typeof (parsed as { noEmbeddings?: unknown }).noEmbeddings === "boolean"
          ? (parsed as { noEmbeddings: boolean }).noEmbeddings
          : false;

      setMessages(nextMessages);
      setNoEmbeddings(noEmbeddingsStored);
    } catch {
      setMessages([]);
      setNoEmbeddings(false);
    } finally {
      hydratedRef.current = true;
    }
  }, [storageKey]);

  useEffect(() => {
    if (!hydratedRef.current) return;

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    saveTimerRef.current = window.setTimeout(() => {
      try {
        const capped = messages.slice(-80).map((m) => {
          if (m.role === "user") {
            return { role: "user", content: m.content.slice(0, 8000) };
          }
          return {
            role: "assistant",
            content: m.content.slice(0, 8000),
            sources: m.sources
              ? m.sources.slice(0, 10).map((s) => ({
                  lessonId: s.lessonId,
                  chunkIndex: s.chunkIndex,
                  distance: s.distance,
                  excerpt: s.excerpt.slice(0, 1200),
                  content: (typeof s.content === "string" ? s.content : "").slice(0, 4000),
                  lessonTitle: s.lessonTitle,
                }))
              : undefined,
          };
        });

        const payload = {
          v: 1,
          updatedAt: Date.now(),
          classId,
          lessonId,
          noEmbeddings,
          messages: capped,
        };
        localStorage.setItem(storageKey, JSON.stringify(payload));
      } catch {}
    }, 600);

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [classId, lessonId, messages, noEmbeddings, storageKey]);

  const [sourceOpen, setSourceOpen] = useState(false);
  const [activeSources, setActiveSources] = useState<ChatSource[]>([]);
  const [activeSource, setActiveSource] = useState<ChatSource | null>(null);

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

      const noEmbeddingsFlag =
        typeof data === "object" &&
        data !== null &&
        typeof (data as { noEmbeddings?: unknown }).noEmbeddings === "boolean"
          ? (data as { noEmbeddings: boolean }).noEmbeddings
          : false;
      setNoEmbeddings(noEmbeddingsFlag);

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
          const content = typeof (s as { content?: unknown }).content === "string" ? (s as { content: string }).content : "";
          const lessonTitle =
            (s as { lessonTitle?: unknown }).lessonTitle === null
              ? null
              : typeof (s as { lessonTitle?: unknown }).lessonTitle === "string"
              ? (s as { lessonTitle: string }).lessonTitle
              : null;
          if (!lessonId || chunkIndex === null || distance === null) return null;
          return {
            lessonId,
            chunkIndex,
            distance,
            excerpt,
            content,
            lessonTitle,
          };
        })
        .filter(
          (v): v is { lessonId: string; chunkIndex: number; distance: number; excerpt: string; content: string; lessonTitle: string | null } =>
            v !== null
        );

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

      <Dialog
        open={sourceOpen}
        onOpenChange={(open) => {
          setSourceOpen(open);
          if (!open) {
            setActiveSources([]);
            setActiveSource(null);
          }
        }}
      >
        <DialogContent
          className="w-[min(92vw,56rem)] max-w-3xl max-h-[90vh]"
          onClose={() => setSourceOpen(false)}
        >
          <DialogHeader className="shrink-0">
            <DialogTitle>Nguồn tham khảo</DialogTitle>
            <DialogDescription>
              {activeSource?.lessonTitle
                ? `Bài học: ${activeSource.lessonTitle}`
                : activeSources.length > 0
                ? "Chọn một nguồn để xem chi tiết."
                : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {activeSources.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
                <div className="space-y-2">
                  {activeSources.map((s, idx) => {
                    const isActive =
                      activeSource?.lessonId === s.lessonId &&
                      activeSource?.chunkIndex === s.chunkIndex;
                    return (
                      <button
                        key={`${s.lessonId}-${s.chunkIndex}`}
                        type="button"
                        onClick={() => setActiveSource(s)}
                        className={
                          isActive
                            ? "w-full text-left rounded-xl border border-slate-200 bg-slate-100 px-3 py-2"
                            : "w-full text-left rounded-xl border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50"
                        }
                      >
                        <div className="text-xs font-semibold text-slate-800">Nguồn {idx + 1}</div>
                        <div className="mt-1 text-[11px] text-slate-600 line-clamp-3">
                          {s.excerpt}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div>
                  {activeSource ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="whitespace-pre-wrap text-sm text-slate-900">
                        {activeSource.content || activeSource.excerpt}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500">Chọn một nguồn ở bên trái để xem chi tiết.</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-500">Không có dữ liệu nguồn.</div>
            )}
          </div>

          <DialogFooter className="shrink-0">
            <button
              type="button"
              onClick={() => setSourceOpen(false)}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[12px] font-semibold text-slate-800 hover:bg-slate-50"
            >
              Đóng
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="text-sm font-semibold text-slate-800">Trợ lý AI (RAG Tutor)</div>
        <div className="text-xs text-slate-600">
          Trợ lý sẽ trả lời dựa trên nội dung bài học đã được hệ thống index.
        </div>

        {noEmbeddings && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
            Bài học hiện chưa được index dữ liệu để AI tra cứu. Bạn có thể thử lại sau hoặc nhờ giáo viên chạy chức năng index embeddings.
          </div>
        )}

        <div className="space-y-3">
          {messages.length === 0 ? (
            <div className="text-sm text-slate-500">
              Hãy đặt câu hỏi về bài học (ví dụ: "Tóm tắt ý chính", "Giải thích khái niệm X").
            </div>
          ) : (
            messages.map((m, idx) => {
              const displayContent =
                m.role === "assistant" ? sanitizeAssistantContent(m.content) : m.content;

              return (
                <div key={idx} className={m.role === "user" ? "text-right" : "text-left"}>
                  <div
                    className={
                      m.role === "user"
                        ? "inline-block rounded-2xl bg-green-600 text-white px-3 py-2 text-sm max-w-[90%] whitespace-pre-wrap"
                        : "inline-block rounded-2xl bg-slate-100 text-slate-900 px-3 py-2 text-sm max-w-[90%] whitespace-pre-wrap"
                    }
                  >
                    {displayContent}
                  </div>

                  {m.role === "assistant" && m.sources && m.sources.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {m.sources.slice(0, 5).map((s, sourceIndex) => (
                        <button
                          key={`${s.lessonId}-${s.chunkIndex}`}
                          type="button"
                          onClick={() => {
                            const list: ChatSource[] = m.sources
                              ? m.sources
                                  .map((src) => ({
                                    lessonId: src.lessonId,
                                    chunkIndex: src.chunkIndex,
                                    distance: src.distance,
                                    excerpt: src.excerpt,
                                    content: typeof src.content === "string" ? src.content : src.excerpt,
                                    lessonTitle: typeof src.lessonTitle === "string" ? src.lessonTitle : null,
                                  }))
                                  .slice(0, 10)
                              : [];

                            const next = list.find(
                              (x) => x.lessonId === s.lessonId && x.chunkIndex === s.chunkIndex
                            );

                            setActiveSources(list);
                            setActiveSource(next ?? null);
                            setSourceOpen(true);
                          }}
                          className="group"
                        >
                          <Badge variant="outline" title={s.excerpt} className="cursor-pointer group-hover:bg-slate-50">
                            Nguồn {sourceIndex + 1}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
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
