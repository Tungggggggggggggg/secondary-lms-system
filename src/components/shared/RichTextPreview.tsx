"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface RichTextPreviewProps {
  html: string;
  className?: string;
}

export default function RichTextPreview({ html, className }: RichTextPreviewProps) {
  return (
    <div className={cn("prose max-w-none", className)}
      // Nội dung đã được sanitize ở EssayQuestionEditor trước đó
      dangerouslySetInnerHTML={{ __html: html || "" }}
    />
  );
}
