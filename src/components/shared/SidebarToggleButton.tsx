"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Tooltip from "@/components/ui/tooltip";

interface SidebarToggleButtonProps {
  expanded: boolean;
  onToggle: () => void;
  ariaControls: string;
  variant?: "light" | "dark";
  size?: "sm" | "md";
}

// Nút toggle sidebar: rõ ràng, phản hồi tức thì, có Tooltip & ARIA
export default function SidebarToggleButton({ expanded, onToggle, ariaControls, variant = "dark", size = "md" }: SidebarToggleButtonProps) {
  const label = useMemo(() => (expanded ? "Thu gọn sidebar" : "Mở rộng sidebar"), [expanded]);
  const btnClass = variant === "light"
    ? "rounded-lg bg-gray-100 hover:bg-gray-200 focus-visible:ring-violet-300"
    : "rounded-lg bg-white/10 hover:bg-white/20 focus-visible:ring-yellow-300";
  const iconClass = variant === "light" ? "text-gray-700" : "text-white";
  const sizeCls = size === "sm" ? "w-8 h-8" : "w-10 h-10";
  return (
    <Tooltip content={label}>
      <button
        type="button"
        onClick={onToggle}
        aria-label={label}
        aria-expanded={expanded}
        aria-controls={ariaControls}
        className={`mb-4 inline-flex items-center justify-center ${sizeCls} cursor-pointer focus:outline-none focus-visible:ring-2 transition-transform ${btnClass}`}
      >
        {expanded ? (
          <ChevronLeft className={`h-5 w-5 ${iconClass}`} aria-hidden />
        ) : (
          <ChevronRight className={`h-5 w-5 ${iconClass}`} aria-hidden />
        )}
      </button>
    </Tooltip>
  );
}


