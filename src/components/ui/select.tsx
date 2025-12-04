"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  className?: string;
  color?: "default" | "amber" | "blue" | "green";
}

const colorStyles = {
  default: "border-gray-300 bg-white focus-visible:ring-blue-500 focus-visible:border-blue-500",
  amber: "border-amber-300 bg-amber-50/50 focus-visible:ring-amber-500 focus-visible:border-amber-500",
  blue: "border-blue-300 bg-blue-50/50 focus-visible:ring-blue-500 focus-visible:border-blue-500",
  green: "border-green-300 bg-green-50/50 focus-visible:ring-green-500 focus-visible:border-green-500",
};

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, color = "default", ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          "px-4 py-2 rounded-xl border text-sm font-medium",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0",
          "disabled:cursor-not-allowed disabled:opacity-60",
          "transition-all duration-200",
          colorStyles[color],
          className
        )}
        {...props}
      />
    );
  }
);

Select.displayName = "Select";

export default Select;

