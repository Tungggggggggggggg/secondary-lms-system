"use client";

import { cn } from "@/lib/utils";

interface InitialBadgeProps {
  text: string;
  className?: string;
  size?: "sm" | "md";
  tone?: "slate" | "violet" | "blue" | "green" | "amber" | "red";
}

const toneStyles: Record<NonNullable<InitialBadgeProps["tone"]>, { bg: string; text: string }> = {
  slate: { bg: "bg-slate-900/5", text: "text-slate-700" },
  violet: { bg: "bg-violet-600/10", text: "text-violet-700" },
  blue: { bg: "bg-blue-600/10", text: "text-blue-700" },
  green: { bg: "bg-emerald-600/10", text: "text-emerald-700" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-700" },
  red: { bg: "bg-red-600/10", text: "text-red-700" },
};

export default function InitialBadge({ text, className, size = "md", tone = "slate" }: InitialBadgeProps) {
  const s = size === "sm" ? "h-10 w-10 text-sm" : "h-12 w-12 text-base";
  const t = toneStyles[tone];

  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex items-center justify-center rounded-2xl font-extrabold tracking-wide shadow-sm",
        s,
        t.bg,
        t.text,
        className
      )}
    >
      {text}
    </div>
  );
}
