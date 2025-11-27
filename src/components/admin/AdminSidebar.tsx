"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";
import Avatar from "@/components/ui/avatar";
import { ADMIN_NAV_ITEMS, SUPER_ADMIN_NAV_ITEMS, ROLE_LABELS } from "@/lib/admin/admin-constants";
import { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";
import { useSidebarState } from "@/hooks/useSidebarState";
import SidebarToggleButton from "@/components/shared/SidebarToggleButton";
import Tooltip from "@/components/ui/tooltip";
import { AccordionItem } from "@/components/ui/accordion";

type AppUserRole = "SUPER_ADMIN" | "STAFF" | "TEACHER" | "STUDENT" | "PARENT";

/**
 * Props cho AdminSidebar component
 */
interface AdminSidebarProps {
  userRole: string;
  userEmail?: string;
  userFullname?: string;
  className?: string;
}

/**
 * Component AdminSidebar - Sidebar navigation cho admin dashboard
 * Hiển thị navigation menu với icons, active states, responsive design
 */
export default function AdminSidebar({
  userRole,
  userEmail,
  userFullname,
  className,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const { expanded, toggle } = useSidebarState("sidebar:admin");
  const isSuperAdmin = userRole === "SUPER_ADMIN";
  const navItems = isSuperAdmin ? SUPER_ADMIN_NAV_ITEMS : ADMIN_NAV_ITEMS;
  const [brandColor, setBrandColor] = useState<string>("#8b5cf6");

  const groups: { title: string; ids: string[] }[] = isSuperAdmin
    ? [
        { title: "Tổng quan", ids: ["overview"] },
        { title: "Tổ chức", ids: ["organizations"] },
        { title: "Hệ thống", ids: ["system", "settings", "users", "audit"] },
      ]
    : [
        { title: "Tổng quan", ids: ["overview"] },
        { title: "Lớp học", ids: ["classrooms"] },
        { title: "Tổ chức", ids: ["members", "org-settings"] },
        { title: "Nhập liệu", ids: ["bulk-operations"] },
        { title: "Báo cáo", ids: ["reports"] },
      ];

  // Animation khi sidebar mount
  useEffect(() => {
    if (sidebarRef.current) {
      // Đảm bảo element có opacity ban đầu là 1 (visible)
      gsap.set(sidebarRef.current, { opacity: 1, visibility: "visible" });
      
      // Animate từ opacity 0 và x: -20 về opacity 1 và x: 0
      const animation = gsap.from(sidebarRef.current, {
        x: -20,
        opacity: 0,
        duration: 0.3,
        ease: "power2.out",
        immediateRender: false, // Không render ngay lập tức
      });
      
      // Đảm bảo sau khi animation hoàn thành, opacity luôn là 1
      animation.eventCallback("onComplete", () => {
        if (sidebarRef.current) {
          gsap.set(sidebarRef.current, { opacity: 1, visibility: "visible" });
        }
      });
      
      // Cleanup: đảm bảo opacity luôn là 1 khi component unmount
      return () => {
        if (sidebarRef.current) {
          gsap.set(sidebarRef.current, { opacity: 1, visibility: "visible" });
        }
        animation.kill();
      };
    }
  }, []);

  // Load brand color từ org settings
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch("/api/admin/org/settings");
        const data = await res.json().catch(() => ({}));
        if (res.ok && mounted) {
          setBrandColor(data?.settings?.brandColor || "#8b5cf6");
        }
      } catch {}
    };
    load();
    const handler = () => load();
    window.addEventListener("org-context-changed", handler as any);
    return () => window.removeEventListener("org-context-changed", handler as any);
  }, []);

  // Render icon từ lucide-react
  const renderIcon = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName];
    if (!IconComponent) return null;
    return <IconComponent className="h-5 w-5" />;
  };

  // Kiểm tra route có active không
  const isActive = (href: string) => {
    if (href === "/dashboard/admin/overview") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-lg bg-white border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? (
            <Icons.X className="h-6 w-6 text-gray-700" />
          ) : (
            <Icons.Menu className="h-6 w-6 text-gray-700" />
          )}
        </button>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className={cn(
          "fixed lg:sticky top-0 left-0 h-screen bg-white border-r border-gray-200 flex flex-col z-40 overflow-hidden rounded-r-2xl",
          "transform transition-all duration-300 ease-in-out",
          // Mobile width giữ 256px; Desktop phụ thuộc expanded
          "w-64",
          expanded ? "lg:w-72" : "lg:w-20",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          className
        )}
        style={{ opacity: 1, visibility: "visible" }}
      >
        {/* Logo/Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <Link href="/dashboard/admin/overview" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: brandColor }}>
                <Icons.Shield className="h-5 w-5 text-white" />
              </div>
              {expanded && (
                <div>
                  <h1 className="font-bold text-lg text-gray-900">Bảng quản trị</h1>
                  <p className="text-xs text-gray-500">
                    {ROLE_LABELS[userRole as AppUserRole] || (isSuperAdmin ? "Super Admin" : "Admin")}
                  </p>
                </div>
              )}
            </Link>
            <SidebarToggleButton expanded={expanded} onToggle={toggle} ariaControls="admin-sidebar" variant="light" size={expanded ? "md" : "sm"} />
          </div>
        </div>

        {/* Navigation */}
        <nav id="admin-sidebar" className={cn("flex-1 overflow-y-auto p-4 space-y-2", expanded ? "pr-1" : "pr-0 [scrollbar-width:none] [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:h-0") }>
          {expanded ? (
            <>
              {groups.map((g) => {
                const items = navItems.filter((n) => g.ids.includes(n.id));
                if (!items.length) return null;
                return (
                  <AccordionItem key={g.title} title={g.title} defaultOpen headerClassName="text-gray-700 hover:bg-gray-50">
                    {items.map((item) => {
                      const active = isActive(item.href);
                      const Icon = renderIcon(item.icon);
                      return (
                        <Link
                          key={item.id}
                          href={item.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          aria-label={item.label}
                          className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                            "hover:bg-gray-50",
                            active ? "bg-violet-50 border-l-2" : "text-gray-700"
                          )}
                          style={active ? { color: brandColor, borderLeftColor: brandColor } : undefined}
                        >
                          {Icon}
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </AccordionItem>
                );
              })}
            </>
          ) : (
            navItems.map((item) => {
              const active = isActive(item.href);
              const Icon = renderIcon(item.icon);
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  aria-label={item.label}
                  className={cn(
                    "flex items-center gap-3 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                    expanded ? "px-4" : "px-2",
                    "hover:bg-gray-50",
                    active ? "bg-violet-50 border-l-2" : "text-gray-700"
                  )}
                  style={active ? { color: brandColor, borderLeftColor: brandColor } : undefined}
                >
                  <Tooltip content={item.label}>
                    <span className="inline-flex items-center justify-center">{Icon}</span>
                  </Tooltip>
                  {false && <span>{item.label}</span>}
                </Link>
              );
            })
          )}
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-gray-200 mt-auto">
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50">
            <Avatar
              fullname={userFullname}
              email={userEmail}
              size="md"
            />
            <div className="flex-1 min-w-0">
              {expanded && (
                <>
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {userFullname || "Admin"}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {userEmail || ""}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {ROLE_LABELS[userRole as AppUserRole] || userRole}
                  </p>
                </>
              )}
            </div>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: "/auth/login" })}
            className="mt-3 w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <Icons.LogOut className="h-5 w-5" />
            {expanded && <span>Đăng xuất</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

