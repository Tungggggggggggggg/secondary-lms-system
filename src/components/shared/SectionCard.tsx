import type { ReactNode } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  title: ReactNode;
  description?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}

export default function SectionCard({ title, description, children, className, actions }: SectionCardProps) {
  return (
    <Card
      className={cn(
        "transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md",
        className
      )}
    >
      <CardHeader className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1.5">
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
