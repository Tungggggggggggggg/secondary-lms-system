"use client";

import React from "react";
import { Clock } from "lucide-react";

type AttemptTimerProps = {
  remainingSec: number;
  urgentThresholdSec?: number;
  ariaLive?: "polite" | "off";
};

export default function AttemptTimer({ remainingSec, urgentThresholdSec = 300, ariaLive = "polite" }: AttemptTimerProps) {
  const m = Math.floor(Math.max(0, remainingSec) / 60);
  const s = Math.max(0, remainingSec) % 60;
  const label = `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  const urgent = remainingSec <= urgentThresholdSec;

  return (
    <span className={`inline-flex items-center gap-1 font-medium ${urgent ? "text-amber-700" : "text-green-800"}`} aria-live={ariaLive}>
      <Clock className="h-4 w-4" />
      Thời gian còn lại:
      <span className="font-semibold tabular-nums">{label}</span>
    </span>
  );
}
