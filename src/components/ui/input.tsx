"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    className?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type = "text", ...props }, ref) => {
        return (
            <input
                ref={ref}
                type={type}
                className={cn(
                    "block w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-black focus:outline-none",
                    className
                )}
                {...props}
            />
        );
    }
);

Input.displayName = "Input";

export default Input;
