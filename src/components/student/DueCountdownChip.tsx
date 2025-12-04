"use client";

import { Clock } from "lucide-react";
import { useDueCountdown } from "@/hooks/use-due-countdown";

interface Props {
  dueDate?: string | Date | null;
  openAt?: string | Date | null;
  lockAt?: string | Date | null;
}

export default function DueCountdownChip({ dueDate, openAt, lockAt }: Props) {
  const { label, isUpcoming, variant } = useDueCountdown(dueDate, openAt, lockAt);
  if (!label) return null;
  const cls =
    variant === "danger"
      ? "text-rose-600"
      : variant === "warn"
      ? "text-amber-600"
      : variant === "success"
      ? "text-emerald-600"
      : "text-slate-600";
  return (
    <span className={`font-medium whitespace-nowrap inline-flex items-center gap-1 ${cls}`}>
      <Clock className="h-4 w-4" />
      <span>{label}</span>
    </span>
  );
}
