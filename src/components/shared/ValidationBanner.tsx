"use client";

import { AlertCircle, CheckCircle } from "lucide-react";
import type { ReactNode } from "react";

interface Item {
  ok: boolean;
  label: string | ReactNode;
}

interface ValidationBannerProps {
  items: Item[];
}

export default function ValidationBanner({ items }: ValidationBannerProps) {
  if (!items?.length) return null;
  const hasError = items.some((i) => !i.ok);
  return (
    <div
      className={`rounded-lg p-4 border ${
        hasError ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"
      }`}
      aria-live="polite"
    >
      <div className="flex flex-col gap-2">
        {items.map((it, idx) => (
          <div key={idx} className="flex items-center gap-2 text-sm">
            {it.ok ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600" />
            )}
            <span className={it.ok ? "text-green-700" : "text-red-700"}>{it.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
