import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CreateClassroomCardProps {
  title?: string;
  description?: string;
  label?: string;
  icon?: ReactNode;
  onClick: () => void;
  className?: string;
}

export default function CreateClassroomCard({
  title = "Tạo lớp học mới",
  description = "Tạo không gian học tập mới cho học sinh của bạn",
  label,
  icon,
  onClick,
  className,
}: CreateClassroomCardProps) {
  return (
    <article
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-500 p-6 text-white",
        "flex items-center justify-center text-center",
        "cursor-pointer transition-all hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:ring-ring",
        className
      )}
      role="button"
      tabIndex={0}
    >
      <div>
        <div className="mb-3 text-5xl flex justify-center">
          {icon ?? "➕"}
        </div>
        {label && (
          <p className="text-xs uppercase tracking-[0.16em] text-white/80 mb-1">
            {label}
          </p>
        )}
        <h3 className="text-lg font-semibold mb-1">{title}</h3>
        {description && (
          <p className="text-sm text-white/80 max-w-xs mx-auto">
            {description}
          </p>
        )}
      </div>
    </article>
  );
}
