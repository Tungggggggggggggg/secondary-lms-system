"use client";

import React from "react";

type AttemptProgressBarProps = {
  answered: number;
  total: number;
};

export default function AttemptProgressBar({ answered, total }: AttemptProgressBarProps) {
  const pct = total > 0 ? Math.min(100, Math.max(0, Math.round((answered / total) * 100))) : 0;
  return (
    <div className="w-full bg-green-200/80 rounded-full h-2" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Tiến độ làm bài">
      <div className="bg-green-600 h-2 rounded-full transition-[width] duration-300 ease-out" style={{ width: `${pct}%` }} />
    </div>
  );
}
