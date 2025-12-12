import { BookOpen, Users, Briefcase } from "lucide-react";
import type { ReactNode } from "react";

type PageRole = "teacher" | "student" | "parent";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  role?: PageRole;
  badge?: ReactNode;
  size?: "sm" | "md";
  actions?: ReactNode;
  label?: string;
}

const roleStyles = {
  teacher: {
    gradient: "from-blue-100 via-sky-50 to-blue-100",
    border: "border-blue-200",
    label: "text-blue-600",
    accentFrom: "from-blue-300 to-sky-400",
    accentTo: "from-sky-200 to-sky-400",
    icon: Briefcase,
  },
  student: {
    gradient: "from-green-100 via-emerald-50 to-teal-100",
    border: "border-green-200",
    label: "text-green-600",
    accentFrom: "from-green-300 to-emerald-400",
    accentTo: "from-teal-200 to-teal-400",
    icon: BookOpen,
  },
  parent: {
    gradient: "from-amber-100 via-orange-50 to-rose-100",
    border: "border-amber-200",
    label: "text-amber-600",
    accentFrom: "from-amber-300 to-orange-400",
    accentTo: "from-rose-200 to-rose-400",
    icon: Users,
  },
};

export default function PageHeader({ title, subtitle, role = "teacher", badge, size = "md", actions, label }: PageHeaderProps) {
  const style = roleStyles[role];
  const Icon = style.icon;
  const pad = size === "sm" ? "px-5 py-4 sm:px-6 sm:py-5" : "px-6 py-6 sm:px-8 sm:py-7";
  const iconBox = size === "sm" ? "w-14 h-14 sm:w-16 sm:h-16" : "w-16 h-16 sm:w-20 sm:h-20";
  const iconSize = size === "sm" ? "w-7 h-7 sm:w-8 sm:h-8" : "w-8 h-8 sm:w-10 sm:h-10";

  return (
    <header className="mb-6 animate-fade-in">
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-r ${style.gradient} shadow-[0_18px_40px_rgba(15,23,42,0.12)] ${pad} transition-all duration-300`}>
        <div className="flex items-center justify-between gap-6">
          <div className="space-y-2 flex-1">
            <p className={`text-[11px] font-semibold tracking-[0.16em] ${style.label} uppercase`}>
              {label ?? "Bảng điều khiển học tập"}
            </p>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm sm:text-base text-slate-700 max-w-xl font-medium">
                {subtitle}
              </p>
            )}
          </div>

          <div className="hidden sm:flex items-center justify-center gap-4">
            {badge && (
              <div className="flex items-center justify-center">
                {badge}
              </div>
            )}
            {actions}
            <div className="relative">
              <div className={`${iconBox} rounded-2xl bg-white/80 backdrop-blur flex items-center justify-center shadow-[0_10px_30px_rgba(15,23,42,0.12)] transition-transform duration-300 hover:scale-110`}>
                <Icon className={`${iconSize} text-slate-700`} />
              </div>
              <div className={`pointer-events-none absolute -bottom-3 -left-4 h-10 w-10 rounded-2xl bg-gradient-to-br ${style.accentFrom} opacity-60 blur-[2px]`} />
              <div className={`pointer-events-none absolute -top-4 -right-6 h-12 w-12 rounded-full bg-gradient-to-br ${style.accentTo} opacity-40 blur-sm`} />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
