"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    className?: string;
    color?: "default" | "amber" | "blue" | "green";
}

const colorStyles = {
  default: "border-input bg-background focus-visible:ring-ring",
  amber: "border-amber-300 bg-amber-50/50 focus-visible:border-amber-500 focus-visible:ring-amber-500",
  blue: "border-blue-300 bg-blue-50/50 focus-visible:border-blue-500 focus-visible:ring-blue-500",
  green: "border-green-300 bg-green-50/50 focus-visible:border-green-500 focus-visible:ring-green-500",
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type = "text", color = "default", ...props }, ref) => {
        return (
            <input
                ref={ref}
                type={type}
                className={cn(
                    "block w-full rounded-xl border px-4 py-3 text-base font-medium text-foreground placeholder:text-muted-foreground",
                    "transition-all duration-200",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    "disabled:cursor-not-allowed disabled:opacity-60",
                    colorStyles[color],
                    className
                )}
                {...props}
            />
        );
    }
);

Input.displayName = "Input";

export default Input;
