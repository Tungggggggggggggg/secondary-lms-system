"use client";

type Status = "graded" | "submitted" | "pending";

interface Props {
  status: Status;
}

export default function GradeStatusBadge({ status }: Props) {
  const map = {
    graded: {
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
      label: "Đã chấm",
    },
    submitted: {
      cls: "bg-amber-50 text-amber-700 border-amber-200",
      label: "Chờ chấm",
    },
    pending: {
      cls: "bg-muted/40 text-muted-foreground border-border",
      label: "Chưa nộp",
    },
  } as const;
  const cur = map[status] ?? map.pending;
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shadow-sm border ${cur.cls}`}>
      {cur.label}
    </span>
  );
}
