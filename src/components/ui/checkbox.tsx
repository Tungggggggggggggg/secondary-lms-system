"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  onCheckedChange?: (checked: boolean) => void;
  color?: "default" | "amber" | "blue" | "green";
}

const colorStyles = {
  default: "text-violet-600 focus:ring-violet-500",
  amber: "text-amber-600 focus:ring-amber-500",
  blue: "text-blue-600 focus:ring-blue-500",
  green: "text-green-600 focus:ring-green-500",
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
          "h-4 w-4 rounded border-gray-300 focus:ring-2",
          colorStyles[color],
          "disabled:opacity-50 disabled:cursor-not-allowed",
          className
        )}
        onChange={handleChange}
        {...props}
      />
    );
  }
);

Checkbox.displayName = "Checkbox";

