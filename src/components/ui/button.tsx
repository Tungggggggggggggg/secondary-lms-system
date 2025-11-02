"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    asChild?: boolean;
    className?: string;
    variant?: "default" | "outline" | "ghost";
    size?: "default" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "default", size = "default", asChild = false, children, ...props }, ref) => {
        const Comp = asChild ? Slot : "button";
        return (
            <Comp
                ref={ref}
                className={cn(
                    "inline-flex items-center justify-center rounded-xl text-sm font-medium transition-all",
                    "disabled:opacity-60 disabled:cursor-not-allowed",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
                    
                    // Variants
                    {
                      default: [
                        "bg-gradient-to-r from-violet-500 to-violet-600",
                        "text-white shadow hover:shadow-lg",
                        "hover:-translate-y-0.5 active:translate-y-0",
                      ],
                      outline: [
                        "border-2 border-violet-500 text-violet-600",
                        "hover:bg-violet-50",
                      ],
                      ghost: [
                        "bg-transparent text-gray-700",
                        "hover:bg-gray-100",
                      ],
                    }[variant],
                    
                    // Sizes
                    {
                      default: "h-10 px-4 py-2",
                      lg: "h-12 px-6 py-3",
                    }[size],
                    
                    className
                )}
                {...props}
            >
                {children}
            </Comp>
        );
    }
);

Button.displayName = "Button";

export default Button;
