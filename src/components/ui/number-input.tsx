"use client";

import React, { useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface NumberInputProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  color?: "default" | "amber" | "blue" | "green";
  ariaLabel?: string;
}

const ringByColor: Record<NonNullable<NumberInputProps["color"]>, string> = {
  default: "focus-within:ring-gray-500",
  amber: "focus-within:ring-amber-500",
  blue: "focus-within:ring-blue-500",
  green: "focus-within:ring-green-500",
};

export function NumberInput({ value, onChange, min = 0, max = 9999, step = 1, className, color = "blue", ariaLabel }: NumberInputProps) {
  const buttonColor = color === "default" ? undefined : color;
  const clamp = useCallback((n: number) => {
    return Math.max(min, Math.min(max, n));
  }, [min, max]);

  const inc = useCallback(() => onChange(clamp(value + step)), [value, step, clamp, onChange]);
  const dec = useCallback(() => onChange(clamp(value - step)), [value, step, clamp, onChange]);

  const onInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.trim();
    if (raw === "") {
      onChange(min);
      return;
    }
    const n = Number.parseInt(raw, 10);
    if (!Number.isNaN(n)) onChange(clamp(n));
  };

  const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const n = Number.parseInt(e.currentTarget.value || String(min), 10);
    onChange(clamp(Number.isNaN(n) ? min : n));
  };

  return (
    <div className={cn("flex h-11 items-stretch rounded-xl border-2 bg-white overflow-hidden", ringByColor[color], className)}>
      <Button type="button" variant="outline" color={buttonColor} onClick={dec} aria-label="Giảm" className="h-full w-12 rounded-none border-0">-</Button>
      <input
        inputMode="numeric"
        pattern="[0-9]*"
        value={Number.isFinite(value) ? value : 0}
        onChange={onInput}
        onBlur={onBlur}
        aria-label={ariaLabel}
        className="flex-1 px-4 text-base font-medium text-gray-900 outline-none text-center"
      />
      <Button type="button" variant="outline" color={buttonColor} onClick={inc} aria-label="Tăng" className="h-full w-12 rounded-none border-0">+</Button>
    </div>
  );
}
