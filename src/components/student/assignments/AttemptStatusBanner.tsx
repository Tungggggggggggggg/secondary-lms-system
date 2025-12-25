"use client";

import React from "react";
import { AlertTriangle, OctagonX } from "lucide-react";

type AttemptStatusBannerProps = {
  status: "paused" | "terminated";
  description?: string;
};

export default function AttemptStatusBanner({ status, description }: AttemptStatusBannerProps) {
  const isPaused = status === "paused";
  const Icon = isPaused ? AlertTriangle : OctagonX;
  const title = isPaused ? "Phiên thi đang tạm dừng" : "Phiên thi đã bị chấm dứt";
  const cls = isPaused
    ? "mb-4 rounded-xl border p-4 bg-amber-50 border-amber-200 text-amber-800"
    : "mb-4 rounded-xl border p-4 bg-rose-50 border-rose-200 text-rose-800";

  return (
    <div className={cls} role="status" aria-live="polite">
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 mt-0.5" />
        <div>
          <div className="font-semibold">{title}</div>
          {description ? <div className="text-sm mt-1">{description}</div> : null}
        </div>
      </div>
    </div>
  );
}
