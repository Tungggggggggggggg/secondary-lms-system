"use client";

import { useCallback, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import AttachmentBar from "./AttachmentBar";

type Props = {
  onSubmit: (content: string, files: File[]) => Promise<void> | void;
  disabled?: boolean;
  maxLength?: number;
  className?: string;
};

export default function AnnouncementComposer({ onSubmit, disabled, maxLength = 2000, className }: Props) {
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [posting, setPosting] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return;
    const arr = Array.from(newFiles);
    setFiles((prev) => [...prev, ...arr]);
  }, []);

  const removeAt = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const canSubmit = content.trim().length > 0 && !posting && !disabled;

  const doSubmit = async () => {
    if (!canSubmit) return;
    try {
      setPosting(true);
      await onSubmit(content.trim(), files);
      setContent("");
      setFiles([]);
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-5 shadow-sm ${className ?? ""}`}
         aria-busy={posting}
    >
      <div className="space-y-4">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, maxLength))}
          placeholder="Chia sẻ thông báo cho lớp..."
          className="min-h-[120px] text-base"
          maxLength={maxLength}
        />

        <div
          className="flex items-center gap-3 rounded-lg"
          onDragOver={(e) => { e.preventDefault(); }}
          onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            className="text-sm"
          >
            Chọn tệp
          </Button>
          <div className="text-xs text-slate-500">Kéo & thả tệp vào đây để đính kèm</div>
          <Button onClick={doSubmit} disabled={!canSubmit} className="ml-auto">
            {posting ? "Đang đăng..." : "Đăng"}
          </Button>
        </div>

        {files.length > 0 && (
          <AttachmentBar files={files} onRemove={removeAt} />
        )}
      </div>
    </div>
  );
}
