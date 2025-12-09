"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Upload, FileText, Image as ImageIcon, Video, X } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useMemo, useRef, useState } from "react";

interface UploadAreaProps {
  value: File[];
  onChange: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSizeBytes?: number; // default 10MB
  allowedTypes?: string[]; // list of mime types
  title?: string | ReactNode;
  description?: string | ReactNode;
  className?: string;
}

export default function UploadArea({
  value,
  onChange,
  accept = ".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.mp4",
  multiple = true,
  maxSizeBytes = 10 * 1024 * 1024,
  allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/png",
    "image/gif",
    "video/mp4",
  ],
  title = "Kéo thả file hoặc click để chọn",
  description = "Hỗ trợ: PDF, DOC, DOCX, JPG, PNG, GIF, MP4 (tối đa 10MB/file)",
  className,
}: UploadAreaProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const validateFile = useCallback(
    (file: File) => allowedTypes.includes(file.type) && file.size <= maxSizeBytes,
    [allowedTypes, maxSizeBytes]
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const incoming = Array.from(files).filter(validateFile);
      const next = [...value, ...incoming];
      onChange(next);
    },
    [onChange, validateFile, value]
  );

  const removeAt = useCallback(
    (index: number) => onChange(value.filter((_, i) => i !== index)),
    [onChange, value]
  );

  const getIcon = (file: File) => {
    if (file.type.startsWith("image/")) return <ImageIcon className="w-4 h-4" />;
    if (file.type.startsWith("video/")) return <Video className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"] as const;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
          dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
        )}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragActive(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragActive(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragActive(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
        {typeof description === "string" ? (
          <p className="text-gray-600 mb-4">{description}</p>
        ) : (
          description
        )}
        <input
          ref={inputRef}
          type="file"
          multiple={multiple}
          accept={accept}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
        <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
          Chọn file
        </Button>
      </div>

      {value.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900">File đã chọn:</h4>
          {value.map((file, index) => (
            <div key={`${file.name}-${index}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                {getIcon(file)}
                <div>
                  <p className="font-medium text-sm">{file.name}</p>
                  <p className="text-xs text-gray-500">{formatSize(file.size)}</p>
                </div>
              </div>
              <Button variant="ghost" onClick={() => removeAt(index)} className="text-red-500 hover:text-red-700">
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
