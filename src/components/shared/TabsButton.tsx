"use client";

import { cn } from "@/lib/utils";

export interface TabOption {
  id: string;
  label: string;
}

interface TabsButtonProps {
  tabs: TabOption[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  size?: "sm" | "md";
  variant?: "default" | "pill";
  accent?: "student" | "teacher" | "parent" | "neutral";
}

export default function TabsButton({
  tabs,
  activeTab,
  onTabChange,
  size = "sm",
  variant = "pill",
  accent = "neutral",
}: TabsButtonProps) {
  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
  };

  const variantClasses = {
    pill: "rounded-full border",
    default: "rounded-lg border",
  };

  const activeByAccent: Record<NonNullable<TabsButtonProps["accent"]>, string> = {
    student:
      "bg-gradient-to-r from-green-600 to-emerald-600 text-white border-green-600 shadow-md hover:shadow-lg",
    teacher:
      "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-600 shadow-md hover:shadow-lg",
    parent:
      "bg-gradient-to-r from-amber-600 to-orange-600 text-white border-amber-600 shadow-md hover:shadow-lg",
    neutral:
      "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white border-indigo-600 shadow-md hover:shadow-lg",
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "font-semibold transition-all duration-200 ease-out",
            sizeClasses[size],
            variantClasses[variant],
            activeTab === tab.id
              ? activeByAccent[accent]
              : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
