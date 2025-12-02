import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type EmptyStateVariant = "default" | "parent" | "teacher" | "student";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  variant?: EmptyStateVariant;
}

const variantStyles = {
  default: "bg-white border-gray-200",
  parent: "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200",
  teacher: "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200",
  student: "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200",
};

const titleColorStyles = {
  default: "text-gray-800",
  parent: "text-amber-900",
  teacher: "text-blue-900",
  student: "text-green-900",
};

const descriptionColorStyles = {
  default: "text-gray-600",
  parent: "text-amber-700",
  teacher: "text-blue-700",
  student: "text-green-700",
};

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  variant = "default",
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-2xl p-12 text-center border shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-md",
        variantStyles[variant],
        className
      )}
    >
      {icon && <div className="text-6xl mb-4 transition-transform duration-300 hover:scale-110">{icon}</div>}
      <h3 className={cn("text-2xl font-bold mb-2", titleColorStyles[variant])}>{title}</h3>
      {description && <p className={cn("mb-6 text-base", descriptionColorStyles[variant])}>{description}</p>}
      {action}
    </div>
  );
}
