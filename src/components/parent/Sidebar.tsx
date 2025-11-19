// src/components/layout/SidebarParent.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useSidebarState } from "../../hooks/useSidebarState";
import { isActivePath } from "../../utils/routing";
import SidebarToggleButton from "../shared/SidebarToggleButton";
import { useUnreadTotal } from "../../hooks/use-chat";
import Tooltip from "@/components/ui/tooltip";

export default function SidebarParent() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { expanded, toggle } = useSidebarState("sidebar:parent");
  const unreadTotal = useUnreadTotal();
  const menu = [
    { icon: "📊", label: "Dashboard", href: "/dashboard/parent/dashboard" },
    { icon: "👨‍👩‍👧", label: "Con của tôi", href: "/dashboard/parent/children" },
    { icon: "👨‍🏫", label: "Giáo viên", href: "/dashboard/parent/teachers" },
    { icon: "📈", label: "Tiến độ học tập", href: "/dashboard/parent/progress" },
    { icon: "💬", label: "Tin nhắn", href: "/dashboard/parent/messages" },
    { icon: "⚙️", label: "Hồ sơ", href: "/dashboard/parent/profile" },
  ];

  return (
    <aside className={`fixed left-0 top-0 h-full ${expanded ? "w-72" : "w-20"} bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white shadow-2xl rounded-r-2xl z-50 transition-[width] duration-300 ease-in-out flex flex-col overflow-hidden`}>
      <div className={`${expanded ? "p-6" : "px-2 py-4"} flex h-full flex-col overflow-hidden`}>
        <div className={`flex items-center justify-between ${expanded ? "mb-10" : "mb-4"}`}>
          <div className="flex items-center gap-3">
            {expanded && <span className="text-4xl">🎓</span>}
            {expanded && (
              <span className="text-2xl font-extrabold bg-gradient-to-r from-yellow-300 to-yellow-400 bg-clip-text text-transparent">
                EduVerse
              </span>
            )}
          </div>
          <SidebarToggleButton expanded={expanded} onToggle={toggle} ariaControls="parent-sidebar" size={expanded ? "md" : "sm"} />
        </div>

        <div className="bg-white/10 rounded-2xl p-4 mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-14 h-14 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full flex items-center justify-center text-2xl font-bold">
              {session?.user?.name?.charAt(0).toUpperCase() || "PH"}
            </div>
            {expanded && (
              <div>
                <h3 className="font-bold text-lg">{session?.user?.name || "Phụ huynh"}</h3>
                <p className="text-white/80 text-sm">Phụ huynh</p>
              </div>
            )}
          </div>
        </div>

        <nav id="parent-sidebar" className={`space-y-2 flex-1 overflow-y-auto ${expanded ? "pr-1" : "pr-0 [scrollbar-width:none] [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:h-0"}`}>
          {menu.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                aria-label={!expanded ? item.label : undefined}
                className={`flex items-center gap-3 ${expanded ? "px-4" : "px-2"} py-3 rounded-xl font-semibold transition-all ${
                  active
                    ? "bg-white/30 shadow-lg"
                    : "hover:bg-white/20 text-white/90"
                }`}
              >
                {expanded ? (
                  <span className="text-xl">{item.icon}</span>
                ) : (
                  <Tooltip content={item.label}>
                    <span className="text-xl">{item.icon}</span>
                  </Tooltip>
                )}
                {expanded && <span>{item.label}</span>}
                {item.href === "/dashboard/parent/messages" && unreadTotal > 0 && (
                  <span className="ml-auto inline-flex items-center justify-center min-w-[1.25rem] h-5 text-[10px] font-bold bg-red-500 text-white rounded-full px-1.5">
                    {unreadTotal}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-4">
          <button
            onClick={() => signOut({ callbackUrl: "/auth/login" })}
            className="w-full flex items-center gap-3 px-4 py-3 bg-red-500/20 rounded-xl font-semibold hover:bg-red-500/30 transition-all"
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