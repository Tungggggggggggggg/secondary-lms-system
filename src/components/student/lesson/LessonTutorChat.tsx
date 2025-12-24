"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import RateLimitDialog, { getRetryAfterSecondsFromResponse } from "@/components/shared/RateLimitDialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";

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

const assistantMarkdownComponents: Components = {
  a: ({ href, children, ...props }) => (
    <a
      href={typeof href === "string" ? href : undefined}
      target="_blank"
      rel="noreferrer noopener"
      className="underline underline-offset-2 text-foreground hover:opacity-80"
      {...props}
    >
      {children}
    </a>
  ),
  h1: ({ children, ...props }) => (
    <h1 className="m-0 my-1 text-base font-semibold" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2 className="m-0 my-1 text-base font-semibold" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 className="m-0 my-1 text-sm font-semibold" {...props}>
      {children}
    </h3>
  ),
  h4: ({ children, ...props }) => (
    <h4 className="m-0 my-1 text-sm font-semibold" {...props}>
      {children}
    </h4>
  ),
  h5: ({ children, ...props }) => (
    <h5 className="m-0 my-1 text-sm font-semibold" {...props}>
      {children}
    </h5>
  ),
  h6: ({ children, ...props }) => (
    <h6 className="m-0 my-1 text-sm font-semibold" {...props}>
      {children}
    </h6>
  ),
  blockquote: ({ children, ...props }) => (
    <blockquote className="m-0 my-2 border-l-2 border-border pl-3 text-muted-foreground" {...props}>
      {children}
    </blockquote>
  ),
  hr: (props) => <hr className="my-2 border-border" {...props} />,
  p: ({ children, ...props }) => (
    <p className="m-0 whitespace-normal break-words" {...props}>
      {children}
    </p>
  ),
  ul: ({ children, ...props }) => (
    <ul className="my-1 list-disc pl-5 space-y-0.5 marker:text-muted-foreground" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="my-1 list-decimal pl-5 space-y-0.5 marker:text-muted-foreground" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li className="whitespace-normal break-words" {...props}>
      {children}
    </li>
  ),
  input: ({ ...props }) => (
    <input
      {...props}
      className="mr-2 align-middle"
      disabled
    />
  ),
  table: ({ children, ...props }) => (
    <div className="my-2 overflow-x-auto">
      <table className="w-full border-collapse text-sm" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead className="bg-muted/40" {...props}>
      {children}
    </thead>
  ),
  th: ({ children, ...props }) => (
    <th className="border border-border px-2 py-1 text-left font-semibold" {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td className="border border-border px-2 py-1 align-top" {...props}>
      {children}
    </td>
  ),
  tr: ({ children, ...props }) => (
    <tr className="odd:bg-background even:bg-muted/20" {...props}>
      {children}
    </tr>
  ),
  pre: ({ children, ...props }) => (
    <pre
      className="my-2 overflow-x-auto rounded-xl border border-border bg-background/60 p-3 text-[13px] leading-5 [&>code]:border-0 [&>code]:bg-transparent [&>code]:px-0 [&>code]:py-0"
      {...props}
    >
      {children}
    </pre>
  ),
  code: ({ children, ...props }) => (
    <code
      className="rounded-md border border-border bg-background/60 px-1 py-0.5 font-mono text-[13px]"
      {...props}
    >
      {children}
    </code>
  ),
};

function sanitizeAssistantContent(text: string): string {
  // Xóa các đoạn đánh dấu nội bộ dạng (Lesson xxx#y) để học sinh không thấy ID
  const cleaned = text.replace(/\(\s*Lesson [^)]+\)/gi, "");

  // Chỉ chuẩn hoá dòng trống ở ngoài code fence để tránh làm hỏng định dạng code.
  const parts = cleaned.split(/```/);
  const normalized = parts
    .map((part, index) => {
      if (index % 2 === 1) return part;

      const lines = part.split("\n");
      const out: string[] = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? "";
        const markerOnly = /^\s*([-*+]|•)\s*$/.test(line);
        if (!markerOnly) {
          out.push(line);
          continue;
        }

        const nextLine = lines[i + 1];
        if (typeof nextLine !== "string") {
          continue;
        }

        const nextTrim = nextLine.trim();
        if (nextTrim.length === 0) {
          continue;
        }

        const indentMatch = /^\s*/.exec(line);
        const indent = indentMatch ? indentMatch[0] : "";
        const markerChar = line.trim().startsWith("•") ? "-" : (line.trim()[0] ?? "-");
        out.push(`${indent}${markerChar} ${nextTrim}`);
        i += 1;
      }

      return out
        .join("\n")
        // Bỏ dòng trống trước một list item (giúp list không bị cách quá xa như ảnh)
        .replace(/\n\s*\n(?=\s*([-*+]|•)\s+\S)/g, "\n")
        // Chuẩn hoá: không cho quá 2 dòng trống liên tiếp
        .replace(/\n{3,}/g, "\n\n");
    })
    .join("```");

  return normalized.trim();
}

/**
 * Chat Tutor (RAG) dành cho học sinh theo từng bài học.
 * Input: `classId`, `lessonId`.
 * Output: UI chat + gọi API `/api/ai/tutor/chat`.
 * Side effects: Lưu lịch sử chat vào localStorage theo lesson.
 */
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

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollRef = useRef(true);

  const lastUserMessage = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]?.role === "user") return messages[i] as { role: "user"; content: string };
    }
    return null;
  }, [messages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    shouldAutoScrollRef.current = nearBottom;
  }, []);

  useEffect(() => {
    if (!shouldAutoScrollRef.current) return;
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text: string, options?: { appendUserMessage?: boolean }) => {
    const appendUserMessage = options?.appendUserMessage ?? true;
    const content = text.trim();
    if (!content || loading) return;

    const historyBase =
      !appendUserMessage && messages.length > 0 && messages[messages.length - 1]?.role === "user" &&
      (messages[messages.length - 1] as { role: "user"; content: string }).content.trim() === content
        ? messages.slice(0, -1)
        : messages;

    const history = historyBase.slice(-20).map((m) => ({ role: m.role, content: m.content }));

    if (appendUserMessage) {
      setMessages((prev) => [...prev, { role: "user", content }]);
      setInput("");
    }

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
            await send(lastUserMessage.content, { appendUserMessage: false });
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
                            ? "w-full text-left rounded-xl border border-border bg-muted px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                            : "w-full text-left rounded-xl border border-border bg-background px-3 py-2 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        }
                      >
                        <div className="text-xs font-semibold text-foreground">Nguồn {idx + 1}</div>
                        <div className="mt-1 text-[11px] text-muted-foreground line-clamp-3">
                          {s.excerpt}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div>
                  {activeSource ? (
                    <div className="rounded-2xl border border-border bg-muted/40 p-4">
                      <div className="whitespace-pre-wrap text-sm text-foreground">
                        {activeSource.content || activeSource.excerpt}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">Chọn một nguồn ở bên trái để xem chi tiết.</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Không có dữ liệu nguồn.</div>
            )}
          </div>

          <DialogFooter className="shrink-0">
            <button
              type="button"
              onClick={() => setSourceOpen(false)}
              className="inline-flex items-center justify-center rounded-xl border border-border bg-background px-4 py-2.5 text-[12px] font-semibold text-foreground hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Đóng
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="text-sm font-semibold text-foreground">Trợ lý AI (RAG Tutor)</div>
        <div className="text-xs text-muted-foreground">
          Trợ lý sẽ trả lời dựa trên nội dung bài học đã được hệ thống index.
        </div>

        {noEmbeddings && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
            Bài học hiện chưa được index dữ liệu để AI tra cứu. Bạn có thể thử lại sau hoặc nhờ giáo viên chạy chức năng index embeddings.
          </div>
        )}

        <div
          ref={scrollRef}
          onScroll={() => {
            const el = scrollRef.current;
            if (!el) return;
            const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
            shouldAutoScrollRef.current = nearBottom;
          }}
          className="space-y-3 max-h-[60vh] overflow-y-auto overflow-x-hidden pr-1 scrollbar-stable overscroll-contain"
        >
          {messages.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Hãy đặt câu hỏi về bài học (ví dụ: "Tóm tắt ý chính", "Giải thích khái niệm X").
            </div>
          ) : (
            messages.map((m, idx) => {
              const displayContent =
                m.role === "assistant" ? sanitizeAssistantContent(m.content) : m.content;

              return (
                <div key={idx} className={m.role === "user" ? "text-right" : "text-left"}>
                  <div className="inline-flex flex-col items-start gap-1 max-w-[90%]">
                    <div
                      className={
                        m.role === "user"
                          ? "inline-block rounded-2xl bg-green-600 text-white px-3 py-2 text-sm whitespace-pre-wrap break-words"
                          : "inline-block rounded-2xl bg-muted text-foreground px-3 py-2 text-sm whitespace-normal break-words leading-relaxed"
                      }
                    >
                      {m.role === "assistant" ? (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeSanitize]}
                          components={assistantMarkdownComponents}
                        >
                          {displayContent}
                        </ReactMarkdown>
                      ) : (
                        displayContent
                      )}
                    </div>

                    {m.role === "assistant" && displayContent && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(displayContent);
                            toast.success("Đã sao chép câu trả lời");
                          } catch {
                            toast.error("Không thể sao chép. Vui lòng thử lại.");
                          }
                        }}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-md px-1"
                        title="Sao chép"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        <span>Sao chép</span>
                      </button>
                    )}
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
                          <Badge variant="outline" title={s.excerpt} className="cursor-pointer group-hover:bg-muted/40">
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

          {loading && (
            <div className="text-left">
              <div className="inline-block rounded-2xl bg-muted text-foreground px-3 py-2 text-sm max-w-[90%]">
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>AI đang trả lời...</span>
                </span>
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>

        <div className="flex items-end gap-2 pt-2 border-t border-border">
          <TextareaAutosize
            minRows={2}
            maxRows={6}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            placeholder="Nhập câu hỏi..."
            className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
