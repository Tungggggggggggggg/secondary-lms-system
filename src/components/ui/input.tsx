"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    className?: string;
    color?: "default" | "amber" | "blue" | "green";
}

const colorStyles = {
  default: "border-gray-300 bg-white focus:border-gray-400 focus:ring-gray-500",
  amber: "border-amber-300 bg-amber-50/50 focus:border-amber-500 focus:ring-amber-500",
  blue: "border-blue-300 bg-blue-50/50 focus:border-blue-500 focus:ring-blue-500",
  green: "border-green-300 bg-green-50/50 focus:border-green-500 focus:ring-green-500",
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type = "text", color = "default", ...props }, ref) => {
        return (
            <input
                ref={ref}
                type={type}
                className={cn(
                    "block w-full rounded-xl border-2 px-4 py-3 text-base font-medium text-gray-900 placeholder:text-gray-400",
                    "transition-all duration-200",
                    "focus:outline-none focus:ring-2 focus:ring-offset-0",
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
