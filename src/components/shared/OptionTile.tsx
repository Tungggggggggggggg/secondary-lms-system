"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type OptionTileColor = "blue" | "green" | "amber" | "violet" | "gray";

interface OptionTileProps {
  title: string;
  description?: string | ReactNode;
  icon?: ReactNode;
  selected?: boolean;
  onSelect?: () => void;
  color?: OptionTileColor;
  className?: string;
  ariaLabel?: string;
  size?: "sm" | "md";
}

export default function OptionTile({
  title,
  description,
  icon,
  selected,
  onSelect,
  color = "blue",
  className,
  ariaLabel,
  size = "md",
}: OptionTileProps) {
  const selectedStyles: Record<OptionTileColor, string> = {
    blue: "border-blue-500 bg-blue-50",
    green: "border-green-500 bg-green-50",
    amber: "border-amber-500 bg-amber-50",
    violet: "border-violet-500 bg-violet-50",
    gray: "border-gray-400 bg-gray-50",
  };

  return (
    <div
      role="radio"
      aria-checked={selected}
      aria-label={ariaLabel ?? title}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.();
        }
      }}
      className={cn(
        size === "sm" ? "p-6" : "p-8",
        "border-2 rounded-xl cursor-pointer transition-all hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring focus-visible:ring-offset-background",
        selected ? selectedStyles[color] : "border-gray-200 hover:border-gray-300",
        className
      )}
    >
      <div className="text-center">
        {icon && (
          <div className={cn(size === "sm" ? "w-12 h-12 mb-3" : "w-16 h-16 mb-4", "mx-auto text-inherit")}>{icon}</div>
        )}
        <h3 className={cn(size === "sm" ? "text-lg" : "text-xl", "font-bold mb-3 text-gray-900")}>
          {title}
        </h3>
        {typeof description === "string" ? (
          <p className="text-gray-600">{description}</p>
        ) : (
          description
        )}
      </div>
    </div>
  );
}
