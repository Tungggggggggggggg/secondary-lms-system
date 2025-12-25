"use client";

import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface AdminUserSectionCardProps {
  title: string;
  description?: string;
  count?: number;
  children: ReactNode;
  tone?: "default" | "primary";
}

export default function AdminUserSectionCard({ title, description, count, children, tone = "default" }: AdminUserSectionCardProps) {
  return (
    <Card
      className={cn(
        "p-6 space-y-4 rounded-2xl border transition-all duration-300",
        tone === "primary"
          ? "border-indigo-200/80 bg-gradient-to-br from-indigo-50 via-sky-50 to-white shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
          : "border-border/80 bg-background shadow-sm"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-foreground">{title}</div>
          {description ? <div className="text-xs text-muted-foreground mt-1">{description}</div> : null}
        </div>
        {typeof count === "number" ? (
          <span className="text-[11px] font-semibold text-muted-foreground">{count} mục</span>
        ) : null}
      </div>

      {children}
    </Card>
  );
}
