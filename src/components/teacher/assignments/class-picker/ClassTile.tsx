"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, CheckCircle, BookOpen } from "lucide-react";

export type ClassTileView = "grid" | "list";

export interface ClassTileProps {
  id: string;
  name: string;
  studentsCount: number;
  subject?: string;
  checked: boolean;
  disabled?: boolean;
  onToggle: (id: string) => void;
  view?: ClassTileView;
  className?: string;
}

export default function ClassTile({
  id,
  name,
  studentsCount,
  subject,
  checked,
  disabled,
  onToggle,
  view = "grid",
  className,
}: ClassTileProps) {
  const handleToggle = () => {
    if (!disabled) onToggle(id);
  };

  return (
    <div
      role="checkbox"
      aria-checked={checked}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onClick={handleToggle}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleToggle();
        }
      }}
      className={cn(
        "border-2 rounded-lg cursor-pointer transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        checked ? "border-blue-500 bg-blue-50 ring-1 ring-blue-200" : "border-gray-200 hover:border-blue-300 hover:bg-gray-50",
        disabled ? "opacity-60 cursor-not-allowed" : undefined,
        view === "list" ? "p-3" : "p-4",
        className
      )}
    >
      <div className={cn("flex items-start", view === "list" ? "gap-3" : "gap-4")}>        
        <div className="pt-0.5">
          <Checkbox checked={checked} onChange={() => {}} aria-hidden className="pointer-events-none" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-800 truncate" title={name}>{name}</h4>
            {checked && <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />}
          </div>
          <div className="mt-1 space-y-1 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>{studentsCount} học sinh</span>
            </div>
            {subject && (
              <div className="flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                <span className="truncate" title={subject}>{subject}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
