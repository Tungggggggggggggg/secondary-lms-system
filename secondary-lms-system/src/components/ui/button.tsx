"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    className?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, children, ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={cn(
                    "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition-all",
                    "disabled:opacity-60 disabled:cursor-not-allowed",
                    className
                )}
                {...props}
            >
                {children}
            </button>
        );
    }
);

Button.displayName = "Button";

export default Button;
