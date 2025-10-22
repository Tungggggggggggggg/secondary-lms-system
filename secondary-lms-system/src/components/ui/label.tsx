import React from "react";

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
        <label className={className} {...props}>
            {children}
        </label>
    );
};

export default Label;
