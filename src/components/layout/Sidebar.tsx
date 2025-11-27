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

type DashboardRole = "teacher" | "student" | "parent";

interface DashboardSidebarProps {
  role: DashboardRole;
}

interface MenuItem {
  icon: string;
  label: string;
  href: string;
}

export default function DashboardSidebar({ role }: DashboardSidebarProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const sidebarStateKey = `sidebar:${role}`;
  const sidebarId = `${role}-sidebar`;
  const { expanded, toggle } = useSidebarState(sidebarStateKey);
  const unreadTotal = useUnreadTotal();

  const teacherMenu: MenuItem[] = [
    { icon: "📊", label: "Dashboard", href: "/dashboard/teacher/dashboard" },
    { icon: "🏫", label: "Lớp học", href: "/dashboard/teacher/classrooms" },
    { icon: "💬", label: "Tin nhắn", href: "/dashboard/teacher/messages" },
    { icon: "✍️", label: "Bài tập", href: "/dashboard/teacher/assignments" },
    { icon: "🖥️", label: "Giám sát thi", href: "/dashboard/teacher/exams/monitor" },
    { icon: "👥", label: "Học sinh", href: "/dashboard/teacher/students" },
    { icon: "📈", label: "Điểm số", href: "/dashboard/teacher/grades" },
    { icon: "⚙️", label: "Hồ sơ", href: "/dashboard/teacher/profile" },
  ];

  const studentMenu: MenuItem[] = [
    { icon: "📊", label: "Dashboard", href: "/dashboard/student/dashboard" },
    { icon: "📚", label: "Lớp học", href: "/dashboard/student/classes" },
    { icon: "💬", label: "Tin nhắn", href: "/dashboard/student/messages" },
    { icon: "✍️", label: "Bài tập", href: "/dashboard/student/assignments" },
    { icon: "📈", label: "Điểm số", href: "/dashboard/student/grades" },
    { icon: "👨‍👩‍👦", label: "Gia đình", href: "/dashboard/student/family" },
    { icon: "⚙️", label: "Hồ sơ", href: "/dashboard/student/profile" },
  ];

  const parentMenu: MenuItem[] = [
    { icon: "📊", label: "Dashboard", href: "/dashboard/parent/dashboard" },
    { icon: "👨‍👩‍👧", label: "Con của tôi", href: "/dashboard/parent/children" },
    { icon: "👨‍🏫", label: "Giáo viên", href: "/dashboard/parent/teachers" },
    { icon: "📈", label: "Tiến độ học tập", href: "/dashboard/parent/progress" },
    { icon: "💬", label: "Tin nhắn", href: "/dashboard/parent/messages" },
    { icon: "⚙️", label: "Hồ sơ", href: "/dashboard/parent/profile" },
  ];

  const menuItems: MenuItem[] =
    role === "teacher" ? teacherMenu : role === "student" ? studentMenu : parentMenu;

  const isActive = (href: string) => isActivePath(pathname, href);

  const userAny = session?.user as { fullname?: string; name?: string } | undefined;
  const displayName =
    userAny?.fullname || userAny?.name || (role === "teacher" ? "Giáo viên" : role === "student" ? "Học sinh" : "Phụ huynh");
  const defaultInitial = role === "teacher" ? "GV" : role === "student" ? "HS" : "PH";
  const roleLabel = role === "teacher" ? "Giáo viên" : role === "student" ? "Học sinh" : "Phụ huynh";

  const messageHref =
    role === "teacher"
      ? "/dashboard/teacher/messages"
      : role === "student"
      ? "/dashboard/student/messages"
      : "/dashboard/parent/messages";

  const roleGradients: Record<DashboardRole, string> = {
    teacher: "from-indigo-600 via-purple-600 to-pink-500",
    student: "from-emerald-500 via-sky-500 to-blue-600",
    parent: "from-orange-500 via-amber-500 to-rose-500",
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-full ${
        expanded ? "w-72" : "w-20"
      } bg-gradient-to-br ${roleGradients[role]} text-white shadow-2xl rounded-r-2xl z-50 transition-[width] duration-300 ease-in-out flex flex-col overflow-hidden`}
    >
      <div className={`${expanded ? "p-6" : "px-2 py-4"} flex h-full flex-col overflow-hidden`}>
        <div
          className={`sticky top-0 z-20 flex items-center justify-between ${
            expanded ? "mb-6 pt-1" : "mb-2 pt-1"
          }`}
        >
          <div className="flex items-center gap-3">
            {expanded && <span className="text-4xl">🎓</span>}
            {expanded && (
              <span className="text-2xl font-extrabold bg-gradient-to-r from-yellow-300 to-yellow-400 bg-clip-text text-transparent">
                EduVerse
              </span>
            )}
          </div>
          <SidebarToggleButton
            expanded={expanded}
            onToggle={toggle}
            ariaControls={sidebarId}
            size={expanded ? "md" : "sm"}
          />
        </div>

        <div className={`${expanded ? "bg-white/10 rounded-2xl p-4 mb-8" : "hidden"}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-14 h-14 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full flex items-center justify-center text-2xl font-bold">
              {userAny?.name?.charAt(0).toUpperCase() || defaultInitial}
            </div>
            {expanded && (
              <div>
                <h3 className="font-bold text-lg">{displayName}</h3>
                <p className="text-white/80 text-sm">{roleLabel}</p>
              </div>
            )}
          </div>
        </div>

        <nav
          id={sidebarId}
          className={`space-y-2 flex-1 overflow-y-auto ${
            expanded
              ? "pr-1 pt-1"
              : "pr-0 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:h-0"
          }`}
        >
          {role === "teacher" && expanded && (
            <>
              <AccordionItem
                title="Tổng quan"
                defaultOpen
                headerClassName="text-white/90 hover:bg-white/10"
                contentClassName=""
              >
                {menuItems
                  .filter((i) => i.label === "Dashboard")
                  .map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-label={item.label}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${
                        isActive(item.href) ? "bg-white/30 shadow-lg" : "hover:bg-white/20"
                      }`}
                    >
                      <span className="text-xl">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  ))}
              </AccordionItem>

              <AccordionItem
                title="Lớp học & Bài tập"
                defaultOpen
                headerClassName="text-white/90 hover:bg-white/10"
              >
                {menuItems
                  .filter((i) => ["Lớp học", "Bài tập", "Giám sát thi"].includes(i.label))
                  .map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-label={item.label}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${
                        isActive(item.href) ? "bg-white/30 shadow-lg" : "hover:bg-white/20"
                      }`}
                    >
                      <span className="text-xl">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  ))}
              </AccordionItem>

              <AccordionItem
                title="Liên lạc & Quản lý"
                defaultOpen
                headerClassName="text-white/90 hover:bg-white/10"
              >
                {menuItems
                  .filter((i) => ["Tin nhắn", "Học sinh", "Điểm số"].includes(i.label))
                  .map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-label={item.label}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${
                        isActive(item.href) ? "bg-white/30 shadow-lg" : "hover:bg-white/20"
                      }`}
                    >
                      <span className="text-xl">{item.icon}</span>
                      <span>{item.label}</span>
                      {item.href === messageHref && unreadTotal > 0 && (
                        <span className="ml-auto inline-flex items-center justify-center min-w-[1.25rem] h-5 text-[10px] font-bold bg-red-500 text-white rounded-full px-1.5">
                          {unreadTotal}
                        </span>
                      )}
                    </Link>
                  ))}
              </AccordionItem>

              <AccordionItem
                title="Tài khoản"
                defaultOpen
                headerClassName="text-white/90 hover:bg-white/10"
              >
                {menuItems
                  .filter((i) => ["Hồ sơ"].includes(i.label))
                  .map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-label={item.label}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${
                        isActive(item.href) ? "bg-white/30 shadow-lg" : "hover:bg-white/20"
                      }`}
                    >
                      <span className="text-xl">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  ))}
              </AccordionItem>
            </>
          )}

          {role === "teacher" && !expanded &&
            menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                className={`flex items-center gap-3 px-2 py-3 rounded-xl font-semibold transition-all ${
                  isActive(item.href) ? "bg-white/30 shadow-lg" : "hover:bg-white/20"
                }`}
              >
                <Tooltip content={item.label}>
                  <span className="text-xl">{item.icon}</span>
                </Tooltip>
                {item.href === messageHref && unreadTotal > 0 && (
                  <span className="ml-auto inline-flex items-center justify-center min-w-[1.25rem] h-5 text-[10px] font-bold bg-red-500 text-white rounded-full px-1.5">
                    {unreadTotal}
                  </span>
                )}
              </Link>
            ))}

          {role !== "teacher" &&
            menuItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={!expanded ? item.label : undefined}
                  className={`flex items-center gap-3 ${expanded ? "px-4" : "px-2"} py-3 rounded-xl font-semibold transition-all ${
                    active ? "bg-white/30 shadow-lg" : "hover:bg-white/20 text-white/90"
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
                  {item.href === messageHref && unreadTotal > 0 && (
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
            className={`w-full flex items-center gap-3 ${
              expanded ? "px-4" : "px-2"
            } py-3 bg-red-500/20 rounded-xl font-semibold hover:bg-red-500/30 transition-all`}
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
