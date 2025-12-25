"use client";

import { AlertCircle, Clock, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type PriorityLevel = "urgent" | "high" | "normal";

interface PriorityBadgeProps {
  priority: PriorityLevel;
  showIcon?: boolean;
  size?: "sm" | "md";
}

const priorityConfig = {
  urgent: {
    label: "SẮP HẾT HẠN",
    icon: AlertCircle,
    bgClass: "bg-red-50",
    textClass: "text-red-600",
    borderClass: "border-red-200",
    iconColor: "text-red-500",
  },
  high: {
    label: "QUAN TRỌNG",
    icon: Clock,
    bgClass: "bg-yellow-50",
    textClass: "text-yellow-600",
    borderClass: "border-yellow-200",
    iconColor: "text-yellow-500",
  },
  normal: {
    label: "BÌNH THƯỜNG",
    icon: CheckCircle,
    bgClass: "bg-blue-50",
    textClass: "text-blue-600",
    borderClass: "border-blue-200",
    iconColor: "text-blue-500",
  },
};

export default function PriorityBadge({
  priority,
  showIcon = true,
  size = "sm",
}: PriorityBadgeProps) {
  const config = priorityConfig[priority];
  const Icon = config.icon;

  const sizeClasses = {
    sm: "px-2 py-1 text-xs gap-1",
    md: "px-3 py-1.5 text-sm gap-1.5",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-semibold transition-all duration-200",
        config.bgClass,
        config.textClass,
        config.borderClass,
        sizeClasses[size]
      )}
    >
      {showIcon && <Icon className={cn("h-3.5 w-3.5", config.iconColor)} />}
      {config.label}
    </span>
  );
}
