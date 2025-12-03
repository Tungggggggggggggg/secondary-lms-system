"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useSidebarState } from "@/hooks/useSidebarState";
import { isActivePath } from "@/utils/routing";
import SidebarToggleButton from "@/components/shared/SidebarToggleButton";
import { useUnreadTotal } from "@/hooks/use-chat";
import Tooltip from "@/components/ui/tooltip";
import { AccordionItem } from "@/components/ui/accordion";
import type { CSSProperties } from "react";
import { sidebarConfig } from "@/constants/sidebar.config";
import NotificationBell from "@/components/shared/NotificationBell";

type DashboardRole = "teacher" | "student" | "parent";

interface DashboardSidebarProps {
  role: DashboardRole;
}

export default function DashboardSidebar({ role }: DashboardSidebarProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const sidebarStateKey = `sidebar:${role}`;
  const sidebarId = `${role}-sidebar`;
  const { expanded, toggle } = useSidebarState(sidebarStateKey);
  const unreadTotal = useUnreadTotal();

  const groups = sidebarConfig[role];

  const messageHref = (() => {
    for (const g of groups) {
      for (const it of g.items) {
        if (it.href.includes("/messages")) return it.href;
      }
    }
    return undefined;
  })();

  const userAny = session?.user as { fullname?: string; name?: string } | undefined;
  const displayName =
    userAny?.fullname || userAny?.name || (role === "teacher" ? "Giáo viên" : role === "student" ? "Học sinh" : "Phụ huynh");
  const defaultInitial = role === "teacher" ? "GV" : role === "student" ? "HS" : "PH";
  const roleLabel = role === "teacher" ? "Giáo viên" : role === "student" ? "Học sinh" : "Phụ huynh";

  const accent = {
    teacher: {
      hover: "hover:bg-gradient-to-r hover:from-blue-100/60 hover:to-indigo-100/60",
      activeBg: "bg-gradient-to-r from-blue-100 to-indigo-100",
      indicator: "bg-blue-600",
      ring: "focus-visible:ring-blue-400/50",
      textAccent: "text-slate-700",
      hoverBorder: "hover:border-blue-300/50",
      activeBorder: "border-blue-300",
      iconBase: "text-slate-600 group-hover:text-blue-700",
      iconActive: "text-blue-700 font-semibold",
      labelBase: "text-slate-700 group-hover:text-blue-800",
      labelActive: "text-blue-800 font-semibold",
    },
    student: {
      hover: "hover:bg-gradient-to-r hover:from-green-100/60 hover:to-emerald-100/60",
      activeBg: "bg-gradient-to-r from-green-100 to-emerald-100",
      indicator: "bg-green-600",
      ring: "focus-visible:ring-green-400/50",
      textAccent: "text-slate-700",
      hoverBorder: "hover:border-green-300/50",
      activeBorder: "border-green-300",
      iconBase: "text-slate-600 group-hover:text-green-700",
      iconActive: "text-green-700 font-semibold",
      labelBase: "text-slate-700 group-hover:text-green-800",
      labelActive: "text-green-800 font-semibold",
    },
    parent: {
      hover: "hover:bg-gradient-to-r hover:from-amber-100/60 hover:to-orange-100/60",
      activeBg: "bg-gradient-to-r from-amber-100 to-orange-100",
      indicator: "bg-amber-600",
      ring: "focus-visible:ring-amber-400/50",
      textAccent: "text-slate-700",
      hoverBorder: "hover:border-amber-300/50",
      activeBorder: "border-amber-300",
      iconBase: "text-slate-600 group-hover:text-amber-700",
      iconActive: "text-amber-700 font-semibold",
      labelBase: "text-slate-700 group-hover:text-amber-800",
      labelActive: "text-amber-800 font-semibold",
    },
  }[role];

  const rolePalette = {
    teacher: {
      bg: "rgba(160, 196, 255, 0.22)",
      border: "rgba(160, 196, 255, 0.35)",
    },
    student: {
      bg: "rgba(202, 255, 191, 0.22)",
      border: "rgba(202, 255, 191, 0.35)",
    },
    parent: {
      bg: "rgba(255, 214, 165, 0.22)",
      border: "rgba(255, 214, 165, 0.35)",
    },
  }[role];

  const isActive = (href: string) => isActivePath(pathname, href);

  const containerVars: CSSProperties = {
    ["--sb-w-expanded" as any]: "280px",
    ["--sb-w-collapsed" as any]: "64px",
  };

  const unreadBadge = unreadTotal > 9 ? "9+" : unreadTotal || undefined;

  const flatItems = groups.flatMap((g) => g.items);

  const containerStyle: CSSProperties = {
    ...containerVars,
    backgroundColor: rolePalette.bg,
    borderColor: rolePalette.border,
  };

  return (
    <aside
      style={containerStyle}
      className={`fixed left-0 top-0 h-full ${
        expanded ? "w-[var(--sb-w-expanded)]" : "w-[var(--sb-w-collapsed)]"
      } text-slate-700 border-r shadow-sm z-50 transition-[width,transform] duration-300 ease-in-out flex flex-col overflow-hidden transform ${expanded ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
    >
      <div className={`${expanded ? "p-5" : "px-2 py-4"} flex h-full flex-col overflow-hidden`}>
        <div
          className={`sticky top-0 z-20 flex items-center ${
            expanded ? "justify-between" : "justify-center"
          } ${expanded ? "mb-4 pt-1" : "mb-2 pt-1"}`}
        >
          {expanded && (
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold text-slate-900">EduVerse</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            {expanded && <NotificationBell panelClassName="w-64" />}
            <SidebarToggleButton
              expanded={expanded}
              onToggle={toggle}
              ariaControls={sidebarId}
              size={expanded ? "md" : "sm"}
              variant="light"
            />
          </div>
        </div>
        <div className={`${expanded ? "rounded-xl border border-gray-200 p-3 mb-4" : "hidden"}`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-sm font-semibold text-slate-700">
              {userAny?.name?.charAt(0).toUpperCase() || defaultInitial}
            </div>
            {expanded && (
              <div className="min-w-0">
                <h3 className="font-semibold text-slate-900 truncate" title={displayName}>{displayName}</h3>
                <p className={`text-xs ${accent.textAccent}`}>{roleLabel}</p>
              </div>
            )}
          </div>
        </div>
        <nav
          id={sidebarId}
          role="menu"
          className={`space-y-2 flex-1 overflow-y-auto ${
            expanded
              ? "pr-1 pt-1"
              : "pr-0 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:h-0"
          }`}
        >
          {expanded ? (
            groups.map((group) => (
              <AccordionItem
                key={group.title}
                title={group.title.toUpperCase()}
                defaultOpen
                headerClassName="text-slate-600 hover:bg-gray-50"
              >
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-label={item.label}
                      className={`relative group flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all focus:outline-none border ${
                        active ? `${accent.activeBg} ${accent.activeBorder}` : `border-transparent ${accent.hover} ${accent.hoverBorder}`
                      } ${accent.ring}`}
                    >
                      {active && (
                        <span className={`absolute left-0 top-0 bottom-0 w-1 rounded-r-full ${accent.indicator}`} aria-hidden="true" />
                      )}
                      <Icon className={`h-5 w-5 transition-colors ${active ? accent.iconActive : accent.iconBase}`} />
                      <span className={`transition-colors duration-200 ${active ? accent.labelActive : accent.labelBase}`}>{item.label}</span>
                      {active && (
                        <span className="sr-only" aria-current="page">Trang hiện tại</span>
                      )}
                      {messageHref === item.href && unreadBadge && (
                        <span className="ml-auto inline-flex items-center justify-center min-w-[1.25rem] h-5 text-[10px] font-bold bg-red-500 text-white rounded-full px-1.5">
                          {unreadBadge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </AccordionItem>
            ))
          ) : (
            flatItems.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  aria-label={item.label}
                  className={`relative group flex items-center gap-3 px-2 py-2.5 rounded-lg transition-all border ${
                    active ? `${accent.activeBg} ${accent.activeBorder}` : `border-transparent ${accent.hover} ${accent.hoverBorder}`
                  }`}
                >
                  {active && (
                    <span className={`absolute left-0 top-0 bottom-0 w-1 rounded-r-full ${accent.indicator}`} aria-hidden="true" />
                  )}
                  <Tooltip content={item.label}>
                    <Icon className={`h-5 w-5 transition-colors ${active ? accent.iconActive : accent.iconBase}`} />
                  </Tooltip>
                  {active && (
                    <span className="sr-only" aria-current="page">Trang hiện tại</span>
                  )}
                  {messageHref === item.href && unreadBadge && (
                    <span className="ml-auto inline-flex items-center justify-center min-w-[1.25rem] h-5 text-[10px] font-bold bg-red-500 text-white rounded-full px-1.5">
                      {unreadBadge}
                    </span>
                  )}
                </Link>
              );
            })
          )}
        </nav>
        <div className="mt-auto pt-4">
          <button
            onClick={() => signOut({ callbackUrl: "/auth/login" })}
            className={`w-full flex items-center gap-3 ${
              expanded ? "px-3" : "px-2"
            } py-2.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg font-semibold transition-all`}
            title={!expanded ? "Đăng xuất" : undefined}
            aria-label={!expanded ? "Đăng xuất" : undefined}
          >
            <span className="text-xl">🚪</span>
            {expanded && <span>Đăng xuất</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
