"use client";

import { BookOpen, Brain } from "lucide-react";

interface Props {
  type?: string;
}

export default function AssignmentTypeBadge({ type }: Props) {
  if (!type) return null;

  const cfg = {
    ESSAY: {
      cls: "bg-indigo-50 text-indigo-700 border-indigo-200",
      Icon: BookOpen,
      label: "Tự luận",
    },
    QUIZ: {
      cls: "bg-pink-50 text-pink-700 border-pink-200",
      Icon: Brain,
      label: "Trắc nghiệm",
    },
  } as const;

  const cur = (cfg as any)[type] || cfg.ESSAY;
  const Icon = cur.Icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${cur.cls}`}>
      <Icon className="h-3.5 w-3.5" />
      <span>{cur.label}</span>
    </span>
  );
}
