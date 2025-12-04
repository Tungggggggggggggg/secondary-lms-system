"use client";

import { AlertCircle, CheckCircle2, Clock, FileText } from "lucide-react";

type Status = "IN_PROGRESS" | "COMPLETED" | "DRAFT" | "UNKNOWN";

interface Props {
  status: Status;
}

export default function AssignmentStatusBadge({ status }: Props) {
  const cfg = {
    IN_PROGRESS: {
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
      Icon: Clock,
      label: "Đang diễn ra",
    },
    COMPLETED: {
      cls: "bg-slate-100 text-slate-800 border-slate-200",
      Icon: CheckCircle2,
      label: "Đã kết thúc",
    },
    DRAFT: {
      cls: "bg-amber-50 text-amber-700 border-amber-200",
      Icon: FileText,
      label: "Bản nháp",
    },
    UNKNOWN: {
      cls: "bg-gray-100 text-gray-700 border-gray-200",
      Icon: AlertCircle,
      label: "Không xác định",
    },
  } as const;

  const cur = cfg[status] ?? cfg.UNKNOWN;
  const Icon = cur.Icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cur.cls}`}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{cur.label}</span>
    </span>
  );
}
