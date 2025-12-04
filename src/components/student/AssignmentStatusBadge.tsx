"use client";

import { CheckCircle2, AlertCircle, Clock, FileText } from "lucide-react";

type Status = "pending" | "submitted" | "overdue";

interface Props {
  status: Status;
}

export default function AssignmentStatusBadge({ status }: Props) {
  const cfg = {
    submitted: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", Icon: CheckCircle2, label: "Đã nộp" },
    overdue: { cls: "bg-rose-50 text-rose-700 border-rose-200", Icon: AlertCircle, label: "Quá hạn" },
    pending: { cls: "bg-sky-50 text-sky-700 border-sky-200", Icon: Clock, label: "Đang diễn ra" },
  } as const;
  const cur = status === "submitted" ? cfg.submitted : status === "overdue" ? cfg.overdue : cfg.pending;
  const I = cur.Icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cur.cls}`}>
      <I className="h-3.5 w-3.5" />
      <span>{cur.label}</span>
    </span>
  );
}
