import React from "react";
import { cn } from "@/lib/utils";

export interface LabelProps
    extends React.LabelHTMLAttributes<HTMLLabelElement> {
    className?: string;
}

export const Label: React.FC<LabelProps> = ({
    children,
    className,
    ...props
}) => {
    return (
        <label
            className={cn(
                "text-sm font-medium text-gray-700 mb-1 block",
                className
            )}
            {...props}
        >
            {children}
        </label>
    );
};

export default Label;
