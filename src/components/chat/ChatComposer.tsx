"use client";

import { useEffect, useRef, useState } from "react";
import { sendMessage } from "@/hooks/use-chat";
import { Loader2, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { uploadChatFile } from "@/lib/supabase-upload";

type Props = {
  conversationId?: string | null;
  onSent?: () => void;
};

export default function ChatComposer({ conversationId, onSent }: Props) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
      toast.error("Không gửi được tin nhắn, vui lòng thử lại.");
    } finally {
      setSending(false);
    }
  };

  const handlePickFiles = () => {
    if (sending) return;
    fileInputRef.current?.click();
  };

  const handleFilesChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!conversationId || files.length === 0) return;
    try {
      setSending(true);
      for (const file of files) {
        const upload = await uploadChatFile(file, conversationId);
        if (!upload.success || !upload.path) {
          toast.error(upload.error || `Không thể upload file ${file.name}`);
          continue;
        }
        await sendMessage(conversationId, "", [
          {
            name: file.name,
            mimeType: file.type || "application/octet-stream",
            sizeBytes: file.size,
            storagePath: upload.path,
          },
        ]);
      }
      onSent?.();
    } catch (err) {
      console.error("[ChatComposer] file upload error", err);
      toast.error("Không gửi được file, vui lòng thử lại.");
    } finally {
      setSending(false);
      if (e.target) {
        e.target.value = "";
      }
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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePickFiles}
            disabled={!conversationId || sending}
            className="h-10 w-10 flex items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            title="Đính kèm file"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={doSend}
            disabled={!value.trim() || !conversationId || sending}
            className="h-11 px-4 rounded-xl bg-indigo-600 text-white font-semibold shadow hover:bg-indigo-700 disabled:opacity-50"
          >
            {sending ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Đang gửi...</span>
              </span>
            ) : (
              "Gửi"
            )}
          </button>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFilesChange}
      />
    </div>
  );
}
