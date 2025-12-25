"use client";

import Link from "next/link";
import { AssignmentTypeBadge } from "@/components/shared";
import AssignmentStatusBadge from "@/components/student/AssignmentStatusBadge";
import DueCountdownChip from "@/components/student/DueCountdownChip";

type Item = {
  id: string;
  title: string;
  type: "ESSAY" | "QUIZ" | string;
  dueDate?: string | null;
  status?: "pending" | "submitted" | "overdue";
};

interface Props {
  item: Item;
  href: string;
}

export default function StudentAssignmentListItem({ item, href }: Props) {
  const due = item.dueDate ? new Date(item.dueDate) : null;
  const status: "pending" | "submitted" | "overdue" =
    item.status === "submitted" ? "submitted" : item.status === "overdue" ? "overdue" : "pending";

  return (
    <Link
      href={href}
      className="group block rounded-xl border border-border bg-background hover:bg-green-50/40 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="p-4 flex items-center gap-3">
        <div className="shrink-0">
          <AssignmentTypeBadge type={String(item.type)} variant="student" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate font-semibold text-foreground">{item.title}</h3>
            {due && (
              <div className="shrink-0"><DueCountdownChip dueDate={due} /></div>
            )}
          </div>
          <div className="mt-1 text-sm text-muted-foreground flex items-center gap-2">
            <AssignmentStatusBadge status={status} />
          </div>
        </div>
      </div>
    </Link>
  );
}
