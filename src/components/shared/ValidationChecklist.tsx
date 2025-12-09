"use client";

import React from "react";
import { CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Item { label: string; ok: boolean; }
interface ValidationChecklistProps {
  items: Item[];
  className?: string;
}

export default function ValidationChecklist({ items, className }: ValidationChecklistProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {items.map((it, idx) => (
        <div className="flex items-center gap-2" key={idx}>
          {it.ok ? (
            <CheckCircle className="w-4 h-4 text-green-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600" />
          )}
          <span className={it.ok ? "text-green-700" : "text-red-700"}>{it.label}</span>
        </div>
      ))}
    </div>
  );
}
