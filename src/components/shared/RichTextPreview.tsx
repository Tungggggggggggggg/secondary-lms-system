"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface RichTextPreviewProps {
  html: string;
  className?: string;
}

export default function RichTextPreview({ html, className }: RichTextPreviewProps) {
  return (
    <div
      className={cn(
        "prose max-w-none",
        "[&_ul]:list-disc [&_ol]:list-decimal",
        "[&_ul]:list-outside [&_ol]:list-outside",
        "[&_ul,&_ol]:pl-6",
        "[&_li]:my-1 [&_p]:my-1",
        className
      )}
      // Nội dung đã được sanitize ở EssayQuestionEditor trước đó
      dangerouslySetInnerHTML={{ __html: html || "" }}
    />
  );
}
