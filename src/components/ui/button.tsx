"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";
import { useRoleTheme } from "@/components/providers/RoleThemeProvider";

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    asChild?: boolean;
    className?: string;
    variant?: "default" | "outline" | "ghost" | "primary";
    size?: "sm" | "default" | "lg";
    color?: "violet" | "amber" | "blue" | "green" | "slate";
}

const colorStyles = {
  slate: {
    default: "bg-slate-900 text-white shadow hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0",
    outline: "border border-border bg-background text-foreground hover:bg-muted/40",
    ghost: "text-foreground hover:bg-muted/40",
    primary: "bg-slate-900 text-white shadow hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0",
  },
  violet: {
    default: "bg-gradient-to-r from-violet-500 to-violet-600 text-white shadow hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0",
    outline: "border-2 border-violet-500 text-violet-600 hover:bg-violet-50",
    ghost: "text-violet-600 hover:bg-violet-50",
    primary: "bg-violet-600 text-white shadow hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0",
  },
  amber: {
    default: "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0",
    outline: "border-2 border-amber-500 text-amber-600 hover:bg-amber-50",
    ghost: "text-amber-600 hover:bg-amber-50",
    primary: "bg-amber-600 text-white shadow hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0",
  },
  blue: {
    default: "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0",
    outline: "border-2 border-blue-500 text-blue-600 hover:bg-blue-50",
    ghost: "text-blue-600 hover:bg-blue-50",
    primary: "bg-blue-600 text-white shadow hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0",
  },
  green: {
    default: "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0",
    outline: "border-2 border-green-500 text-green-600 hover:bg-green-50",
    ghost: "text-green-600 hover:bg-green-50",
    primary: "bg-green-600 text-white shadow hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0",
  },
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "default", size = "default", color, asChild = false, children, ...props }, ref) => {
        const theme = useRoleTheme();
        // Bỏ violet làm mặc định: fallback về theme color, nếu không có thì dùng "blue" (teacher)
        const effectiveColor = (color ?? theme?.color ?? "blue") as keyof typeof colorStyles;
        const Comp = asChild ? Slot : "button";
        return (
            <Comp
                ref={ref}
                className={cn(
                    "inline-flex items-center justify-center rounded-xl text-sm font-medium transition-all",
                    "disabled:opacity-60 disabled:cursor-not-allowed",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    
                    colorStyles[effectiveColor][variant],
                    
                    // Sizes
                    {
                      sm: "h-9 px-3 py-1.5 text-sm",
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
