"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  onCheckedChange?: (checked: boolean) => void;
  color?: "default" | "amber" | "blue" | "green";
}

const colorStyles = {
  default: "text-primary border-input focus-visible:ring-ring",
  amber: "text-amber-600 border-amber-300 focus-visible:ring-amber-500 focus-visible:border-amber-500",
  blue: "text-blue-600 border-blue-300 focus-visible:ring-blue-500 focus-visible:border-blue-500",
  green: "text-green-600 border-green-300 focus-visible:ring-green-500 focus-visible:border-green-500",
} as const;

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, onCheckedChange, onChange, color = "default", ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onCheckedChange) {
        onCheckedChange(e.target.checked);
      }
      if (onChange) {
        onChange(e);
      }
    };

    return (
      <input
        type="checkbox"
        ref={ref}
        className={cn(
          "h-4 w-4 rounded border bg-background",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          colorStyles[color],
          className
        )}
        onChange={handleChange}
        {...props}
      />
    );
  }
);

Checkbox.displayName = "Checkbox";

