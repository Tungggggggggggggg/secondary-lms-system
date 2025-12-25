"use client";

import React from "react";
import { OptionTile } from "@/components/shared";
import type { SubmissionFormat } from "@/types/assignment-builder";
import { cn } from "@/lib/utils";

interface SubmissionFormatSelectorProps {
  value: SubmissionFormat;
  onChange: (v: SubmissionFormat) => void;
  className?: string;
}

export default function SubmissionFormatSelector({ value, onChange, className }: SubmissionFormatSelectorProps) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-4", className)}>
      <OptionTile
        title="Chỉ văn bản"
        description="Học sinh nhập trực tiếp"
        selected={value === 'TEXT'}
        onSelect={() => onChange('TEXT')}
      />
      <OptionTile
        title="Chỉ file"
        description="Học sinh upload file"
        selected={value === 'FILE'}
        onSelect={() => onChange('FILE')}
      />
      <OptionTile
        title="Cả hai"
        description="Linh hoạt nhất"
        selected={value === 'BOTH'}
        onSelect={() => onChange('BOTH')}
      />
    </div>
  );
}
