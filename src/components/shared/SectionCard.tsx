import type { ReactNode } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
  return (
    <Card
      className={cn(
        "rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50/30",
        "transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md",
        className
      )}
    >
      <CardHeader className={cn("border-b border-blue-100", headerPadding)}>
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1.5">
            <CardTitle className="text-lg font-bold text-blue-950">{title}</CardTitle>
            {description && <CardDescription className="text-slate-600">{description}</CardDescription>}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      </CardHeader>
      <div className="border-l-4 border-l-blue-500 rounded-bl-2xl rounded-tl-2xl">
        <CardContent className={contentPadding}>
          {children}
        </CardContent>
      </div>
    </Card>
  );
}
