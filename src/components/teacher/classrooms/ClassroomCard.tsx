import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ClassroomCardProps {
  name: string;
  code: string;
  description?: string | null;
  isActive: boolean;
  studentsCount: number;
  icon?: ReactNode;
  meta?: ReactNode;
  onClick?: () => void;
  className?: string;
}

export default function ClassroomCard({
  name,
  code,
  description,
  isActive,
  studentsCount,
  icon,
  meta,
  onClick,
  className,
}: ClassroomCardProps) {
  const clickable = typeof onClick === "function";

  return (
    <article
      onClick={onClick}
      onKeyDown={(e) => {
        if (!clickable) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={cn(
        "bg-white rounded-2xl shadow-lg p-6 transition-all",
        clickable
          ? "cursor-pointer hover:shadow-xl hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          : "",
        className
      )}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-500 flex items-center justify-center text-2xl text-white">
          {icon ?? name.charAt(0).toUpperCase()}
        </div>
        <span
          className={cn(
            "px-3 py-1 rounded-full text-xs font-medium",
            isActive
              ? "bg-green-50 text-green-700"
              : "bg-gray-100 text-gray-600"
          )}
        >
          {isActive ? "Đang hoạt động" : "Đã lưu trữ"}
        </span>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-1">
        {name}
      </h3>
      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
        {description || "Không có mô tả"}
      </p>

      <div className="flex items-center justify-between text-xs text-gray-600">
        <span>Mã lớp: {code}</span>
        <span>{studentsCount} học sinh</span>
      </div>

      {meta && <div className="mt-3 text-xs text-gray-500">{meta}</div>}
    </article>
  );
}
