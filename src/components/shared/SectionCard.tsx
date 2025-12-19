"use client";

import type { ReactNode } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useRoleTheme } from "@/components/providers/RoleThemeProvider";

interface SectionCardProps {
  title: ReactNode;
  description?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
  size?: "sm" | "md";
}

export default function SectionCard({ title, description, children, className, actions, size = "md" }: SectionCardProps) {
  const headerPadding = size === "sm" ? "p-5" : "p-6";
  const contentPadding = size === "sm" ? "px-5 pt-6 pb-5" : "px-6 pt-7 pb-6";

  const theme = useRoleTheme();
  const effectiveRole =
    theme?.role ??
    (theme?.color === "green"
      ? "student"
      : theme?.color === "amber"
      ? "parent"
      : theme?.color === "blue"
      ? "teacher"
      : undefined);

  const cardToneClass =
    effectiveRole === "teacher"
      ? "teacher-card"
      : effectiveRole === "student"
      ? "student-card"
      : effectiveRole === "parent"
      ? "parent-card"
      : "bg-card";

  const headerBorderClass =
    effectiveRole === "teacher"
      ? "teacher-border"
      : effectiveRole === "student"
      ? "student-border"
      : effectiveRole === "parent"
      ? "parent-border"
      : "border-border";

  const titleClass =
    effectiveRole === "teacher"
      ? "teacher-accent-strong"
      : effectiveRole === "student"
      ? "student-accent-strong"
      : effectiveRole === "parent"
      ? "parent-accent-strong"
      : "text-foreground";

  const leftBorderClass =
    effectiveRole === "admin"
      ? "border-l-primary"
      : effectiveRole === "student"
      ? "border-l-green-500"
      : effectiveRole === "parent"
      ? "border-l-amber-500"
      : effectiveRole === "teacher"
      ? "border-l-blue-500"
      : "border-l-slate-300";

  return (
    <Card
      className={cn(
        "rounded-2xl",
        cardToneClass,
        "transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md",
        className
      )}
    >
      <CardHeader className={cn("border-b", headerBorderClass, headerPadding)}>
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1.5">
            <CardTitle className={cn("text-lg font-bold", titleClass)}>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      </CardHeader>
      <div className={cn("border-l-4 rounded-bl-2xl", leftBorderClass)}>
        <CardContent className={contentPadding}>
          {children}
        </CardContent>
      </div>
    </Card>
  );
}
