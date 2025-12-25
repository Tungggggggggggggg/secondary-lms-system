"use client";

import { useEffect, useRef, useState } from "react";
import { MessageDTO, sendMessage } from "@/hooks/use-chat";
import { Loader2, Paperclip, X, Smile } from "lucide-react";
import { toast } from "sonner";
import { uploadChatFile } from "@/lib/supabase-upload";
import TextareaAutosize from 'react-textarea-autosize';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

type Props = {
  color?: "green" | "blue" | "amber";
  conversationId?: string | null;
  onSent?: () => void;
  replyingTo?: MessageDTO | null;
  onCancelReply?: () => void;
};

export default function ChatComposer({ color = "amber", conversationId, onSent, replyingTo, onCancelReply }: Props) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    ref.current?.focus();
  }, [conversationId]);

  const doSend = async () => {
    if (!conversationId) return;
    const content = value.trim();
    if (!content && (!replyingTo || !replyingTo.attachments)) return; // Allow sending empty message if it's a reply with attachment

    try {
      setSending(true);
      await sendMessage(conversationId, content, undefined, replyingTo?.id);
      setValue("");
      onSent?.();
      onCancelReply?.(); // Clear reply state after sending
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

  const palette = {
    border: color === "green" ? "border-green-200" : color === "blue" ? "border-blue-200" : "border-amber-200",
    bgSoft: color === "green" ? "bg-green-50" : color === "blue" ? "bg-blue-50" : "bg-amber-50",
    textSoft: color === "green" ? "text-green-700" : color === "blue" ? "text-blue-700" : "text-amber-700",
    ring: color === "green" ? "focus:ring-green-500" : color === "blue" ? "focus:ring-blue-500" : "focus:ring-amber-500",
    iconBtnBorder: color === "green" ? "border-green-200" : color === "blue" ? "border-blue-200" : "border-amber-200",
    iconBtnText: color === "green" ? "text-green-600" : color === "blue" ? "text-blue-600" : "text-amber-600",
    iconBtnHover: color === "green" ? "hover:bg-green-50" : color === "blue" ? "hover:bg-blue-50" : "hover:bg-amber-50",
    closeHover: color === "green" ? "hover:bg-green-100" : color === "blue" ? "hover:bg-blue-100" : "hover:bg-amber-100",
    sendBtn: color === "green" ? "bg-green-600 hover:bg-green-700" : color === "blue" ? "bg-blue-600 hover:bg-blue-700" : "bg-amber-600 hover:bg-amber-700",
  };

  return (
    <div className={`border-t ${palette.border} p-3 bg-white`}>
      {replyingTo && (
        <div className={`mb-2 p-2 rounded-lg ${palette.bgSoft} border ${palette.border} text-xs ${palette.textSoft} relative`}>
          <button
            onClick={onCancelReply}
            className={`absolute top-1 right-1 p-1 rounded-full ${palette.closeHover} transition-colors`}
          >
            <X className="h-3 w-3" />
          </button>
          <p className="font-semibold">Trả lời {replyingTo.sender.fullname}</p>
          <p className="truncate italic">{replyingTo.content}</p>
        </div>
      )}
      <div className="relative flex items-end gap-2">
        <TextareaAutosize
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              doSend();
            }
          }}
          placeholder="Nhập tin nhắn..."
          className={`flex-1 resize-none rounded-xl border ${palette.border} p-3 pr-3 min-h-[44px] max-h-40 focus:outline-none focus:ring-2 ${palette.ring} bg-transparent transition-all duration-200`}
          rows={1}
        />
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" className={`h-10 w-10 flex items-center justify-center rounded-full border ${palette.iconBtnBorder} ${palette.iconBtnText} ${palette.iconBtnHover} transition-colors`} title="Chèn emoji">
                <Smile className="h-5 w-5" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-auto border-none shadow-lg">
              <EmojiPicker onEmojiClick={(emojiData: EmojiClickData) => {
                setValue(prev => prev + emojiData.emoji);
              }} />
            </PopoverContent>
          </Popover>
          <button
            type="button"
            onClick={handlePickFiles}
            disabled={!conversationId || sending}
            className={`h-10 w-10 flex items-center justify-center rounded-full border ${palette.iconBtnBorder} ${palette.iconBtnText} ${palette.iconBtnHover} disabled:opacity-50 transition-colors`}
            title="Đính kèm file"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={doSend}
            disabled={!value.trim() || !conversationId || sending}
            className={`h-11 px-4 rounded-xl text-white font-semibold shadow disabled:opacity-50 transition-colors ${palette.sendBtn}`}
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

