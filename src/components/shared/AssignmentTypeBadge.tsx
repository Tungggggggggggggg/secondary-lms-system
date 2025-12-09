"use client";

import { BookOpen, Brain, FileText, ListChecks } from "lucide-react";

type Variant = "teacher" | "student";

interface Props {
  type?: string;
  variant?: Variant;
}

export default function AssignmentTypeBadge({ type, variant = "teacher" }: Props) {
  if (!type) return null;
  const t = String(type).toUpperCase();

  if (variant === "student") {
    const isEssay = t === "ESSAY";
    const cls = isEssay
      ? "bg-green-50 text-green-700 border-green-200"
      : "bg-amber-50 text-amber-700 border-amber-200";
    const Icon = isEssay ? FileText : ListChecks;
    const label = isEssay ? "Tự luận" : "Trắc nghiệm";
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cls}`}>
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
      </span>
    );
  }

  const cfg = {
    ESSAY: { cls: "bg-indigo-50 text-indigo-700 border-indigo-200", Icon: BookOpen, label: "Tự luận" },
    QUIZ: { cls: "bg-pink-50 text-pink-700 border-pink-200", Icon: Brain, label: "Trắc nghiệm" },
  } as const;

  const cur = (cfg as any)[t] || cfg.ESSAY;
  const Icon = cur.Icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${cur.cls}`}>
      <Icon className="h-3.5 w-3.5" />
      <span>{cur.label}</span>
    </span>
  );
}
