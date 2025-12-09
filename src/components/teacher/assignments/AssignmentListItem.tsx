"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { AssignmentTypeBadge } from "@/components/shared";
import type { AssignmentT } from "@/hooks/use-assignments";
import { cn } from "@/lib/utils";

interface AssignmentListItemProps {
  assignment: AssignmentT;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export default function AssignmentListItem({ assignment, checked, onChange }: AssignmentListItemProps) {
  return (
    <div
      role="checkbox"
      aria-checked={checked}
      tabIndex={0}
      className={cn(
        "p-4 rounded-xl border-2 cursor-pointer transition-all",
        checked ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300"
      )}
      onClick={() => onChange(!checked)}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          onChange(!checked);
        }
      }}
    >
      <div className="flex items-start gap-4">
        <Checkbox
          checked={checked}
          aria-label={`Chọn bài tập ${assignment.title}`}
          onChange={(e) => onChange(e.currentTarget.checked)}
          className="mt-1"
          onClick={(e) => e.stopPropagation()}
        />
        <div className="flex-1">
          <h3 className="font-semibold text-gray-800">{assignment.title}</h3>
          {assignment.description ? (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{assignment.description}</p>
          ) : null}
          <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
            <span className="inline-flex items-center gap-2">
              <AssignmentTypeBadge type={assignment.type} variant="teacher" />
            </span>
            {assignment.dueDate ? (
              <span>
                Hạn: {new Date(assignment.dueDate).toLocaleDateString("vi-VN")}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
