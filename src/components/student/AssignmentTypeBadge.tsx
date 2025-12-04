"use client";

import { FileText, ListChecks } from "lucide-react";

interface Props {
  type: "ESSAY" | "QUIZ";
}

export default function AssignmentTypeBadge({ type }: Props) {
  const isEssay = type === "ESSAY";
  const cls = isEssay
    ? "bg-green-50 text-green-700 border-green-200"
    : "bg-amber-50 text-amber-700 border-amber-200";
  const Icon = isEssay ? FileText : ListChecks;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cls}`}>
      <Icon className="h-3.5 w-3.5" />
      <span>{isEssay ? "Tự luận" : "Trắc nghiệm"}</span>
    </span>
  );
}
