import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  color?: "default" | "amber" | "blue" | "green";
}

const colorStyles: Record<string, string> = {
  default: "focus-visible:ring-ring",
  amber: "focus-visible:ring-amber-500 focus-visible:border-amber-500",
  blue: "focus-visible:ring-blue-500 focus-visible:border-blue-500",
  green: "focus-visible:ring-green-500 focus-visible:border-green-500",
};

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, color = "default", ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          colorStyles[color],
          "disabled:cursor-not-allowed disabled:opacity-60",
          "resize-none",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };

