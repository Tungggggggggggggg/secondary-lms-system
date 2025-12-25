"use client";

import { useEffect, useMemo, useState } from "react";

export type CountdownVariant = "neutral" | "warn" | "danger" | "success";

export interface DueCountdown {
  label: string;
  msRemaining: number;
  isUpcoming: boolean;
  variant: CountdownVariant;
}

function toDate(input?: Date | string | null): Date | null {
  if (!input) return null;
  if (input instanceof Date) return input;
  const d = new Date(input);
  return isNaN(d.getTime()) ? null : d;
}

export function useDueCountdown(
  dueDate?: Date | string | null,
  openAt?: Date | string | null,
  lockAt?: Date | string | null
): DueCountdown {
  const due = toDate(dueDate);
  const lock = toDate(lockAt) || due;

  const compute = () => {
    if (!due) return { label: "", msRemaining: 0, isUpcoming: false, variant: "neutral" as CountdownVariant };
    const now = Date.now();
    const target = due.getTime();
    const diff = target - now;
    if (diff <= 0) return { label: "Đã hết hạn", msRemaining: 0, isUpcoming: false, variant: "danger" as CountdownVariant };

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    let label = "";
    if (days > 0) label = `${days} ngày ${hours % 24} giờ`;
    else if (hours > 0) label = `${hours} giờ ${minutes % 60} phút`;
    else label = `${minutes} phút`;

    let variant: CountdownVariant = "neutral";
    if (diff <= 24 * 60 * 60 * 1000) variant = "danger";
    else if (diff <= 72 * 60 * 60 * 1000) variant = "warn";
    else variant = "neutral";

    return { label, msRemaining: diff, isUpcoming: true, variant };
  };

  const [state, setState] = useState<DueCountdown>(compute);

  useEffect(() => {
    setState(compute());
    const id = setInterval(() => setState(compute()), 60000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [due?.getTime(), lock?.getTime()]);

  return state;
}
