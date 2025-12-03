"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export default function SectionHeader({ title, actions, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between mb-6", className)}>
      <h2 className="text-2xl font-extrabold text-gray-800 flex items-center gap-2">{title}</h2>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}
