"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RefreshCw, Copy as CopyIcon } from "lucide-react";

interface CodeFieldProps {
  id?: string;
  value: string;
  onChange: (val: string) => void;
  onGenerate?: () => void;
  onCopy?: () => void;
  error?: string;
  minLength?: number;
  maxLength?: number;
  showCounter?: boolean;
  withCopy?: boolean;
  pattern?: RegExp;
}

export default function CodeField({ id, value, onChange, onGenerate, onCopy, error, minLength = 4, maxLength = 10, showCounter = true, withCopy = true, pattern = /^[A-Z2-9]+$/ }: CodeFieldProps) {
  const lengthOk = value.length === 0 || (value.length >= minLength && value.length <= maxLength);
  const patternOk = value.length === 0 || pattern.test(value);
  const counterText = `${value.length}/${maxLength}`;
  const describedId = error ? `${id}-error` : undefined;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = (e.target.value || "").toUpperCase();
    const onlyValid = raw.replace(/[^A-Z2-9]/g, "");
    onChange(onlyValid.slice(0, maxLength));
  };

  const handleCopy = () => {
    if (!value) return;
    navigator.clipboard?.writeText(value);
    onCopy?.();
  };

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2 items-center">
        <Input
          id={id}
          value={value}
          onChange={handleChange}
          placeholder="VD: AB3F8K"
          color="blue"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedId}
          className="h-11 font-mono tracking-widest"
        />
        <Button type="button" variant="outline" color="blue" onClick={onGenerate} aria-label="Tạo mã ngẫu nhiên" className="h-11 px-4" title="Tạo mã ngẫu nhiên">
          <RefreshCw className="h-5 w-5" />
        </Button>
        {withCopy && (
          <Button type="button" variant="outline" color="blue" onClick={handleCopy} aria-label="Sao chép mã" className="h-11 px-4" title="Sao chép mã" disabled={!value}>
            <CopyIcon className="h-5 w-5" />
          </Button>
        )}
      </div>
      <div className="flex items-center justify-between">
        {error ? (
          <p id={describedId} className="text-xs text-red-600 font-medium">{error}</p>
        ) : (
          <p className="text-xs text-slate-500">Chỉ dùng A–Z và 2–9. Độ dài {minLength}–{maxLength} ký tự.</p>
        )}
        {showCounter && (
          <span className={`text-[11px] font-semibold ${lengthOk && patternOk ? "text-slate-500" : "text-red-600"}`}>{counterText}</span>
        )}
      </div>
    </div>
  );
}
