import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  color?: "default" | "amber" | "blue" | "green";
}

const colorStyles: Record<string, string> = {
  default: "focus-visible:ring-gray-500 focus-visible:border-gray-500",
  amber: "focus-visible:ring-amber-500 focus-visible:border-amber-500",
  blue: "focus-visible:ring-blue-500 focus-visible:border-blue-500",
  green: "focus-visible:ring-green-500 focus-visible:border-green-500",
};

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, color = "default", ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm",
          "placeholder:text-gray-400",
          "focus-visible:outline-none focus-visible:ring-2",
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

