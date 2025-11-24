"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Breadcrumb, { BreadcrumbItem } from "@/components/ui/breadcrumb";
import { SUPER_ADMIN_NAV_ITEMS, ADMIN_NAV_ITEMS } from "@/lib/admin/admin-constants";
import type { UserRole } from "@prisma/client";
import OrgSwitcher from "@/components/admin/OrgSwitcher";
import ViewAsToggle from "@/components/admin/ViewAsToggle";

/**
 * Props cho AdminHeader component
 */
interface AdminHeaderProps {
  userRole: UserRole | string;
  title?: string;
  className?: string;
}

/**
 * Component AdminHeader - Header với breadcrumb cho admin dashboard
 */
export default function AdminHeader({
  userRole,
  title,
  className,
}: AdminHeaderProps) {
  const pathname = usePathname();
  const isSuperAdmin = userRole === "SUPER_ADMIN";
  const [viewAsStaff, setViewAsStaff] = useState(false);
  const [orgDisplayName, setOrgDisplayName] = useState<string>("");
  const [brandColor, setBrandColor] = useState<string>("#8b5cf6");
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch("/api/admin/view-as");
        const data = await res.json();
        if (mounted) setViewAsStaff(!!data?.viewAsStaff);
      } catch {}
    };
    load();
    const handler = () => load();
    window.addEventListener("view-as-changed", handler as any);
    return () => {
      mounted = false;
      window.removeEventListener("view-as-changed", handler as any);
    };
  }, []);

  // Load org settings (displayName, brandColor) theo ngữ cảnh hiện tại
  useEffect(() => {
    let mounted = true;
    const loadSettings = async () => {
      try {
        const res = await fetch("/api/admin/org/settings");
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return;
        const dn = data?.settings?.displayName || "";
        const bc = data?.settings?.brandColor || "#8b5cf6";
        if (mounted) {
          setOrgDisplayName(dn);
          setBrandColor(bc);
        }
      } catch {}
    };
    loadSettings();
    const handler = () => loadSettings();
    window.addEventListener("org-context-changed", handler as any);
    return () => window.removeEventListener("org-context-changed", handler as any);
  }, []);
  const navItems = isSuperAdmin && !viewAsStaff ? SUPER_ADMIN_NAV_ITEMS : ADMIN_NAV_ITEMS;

  // Tạo breadcrumb items từ pathname
  const getBreadcrumbItems = (): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [
      { label: "Bảng quản trị", href: "/dashboard/admin/overview" },
    ];

    // Tìm nav item matching với pathname
    const currentNavItem = navItems.find((item) => {
      if (item.href === "/dashboard/admin/overview") {
        return pathname === item.href;
      }
      return pathname.startsWith(item.href);
    });

    if (currentNavItem && pathname !== "/dashboard/admin/overview") {
      items.push({
        label: currentNavItem.label,
        href: currentNavItem.href,
      });

      // Nếu có nested route, thêm vào breadcrumb
      const pathSegments = pathname.split("/").filter(Boolean);
      if (pathSegments.length > 4) {
        const lastSegment = pathSegments[pathSegments.length - 1];
        // Chuyển đổi segment thành label (ví dụ: "settings" -> "Cài đặt")
        const segmentLabels: Record<string, string> = {
          settings: "Cài đặt",
          members: "Thành viên tổ chức",
        };
        items.push({
          label: segmentLabels[lastSegment] || lastSegment,
        });
      }
    }

    // Nếu có custom title, thêm vào cuối
    if (title && !items.some((item) => item.label === title)) {
      items.push({ label: title });
    }

    return items;
  };

  const breadcrumbItems = getBreadcrumbItems();

  return (
    <div className={className} style={{ borderTop: `3px solid ${brandColor}` }}>
      <div className="flex items-center justify-between mb-4">
        <div className="min-w-0">
          {breadcrumbItems.length > 1 ? (
            <Breadcrumb items={breadcrumbItems} />
          ) : (
            title && (
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            )
          )}
        </div>
        <div className="shrink-0 flex items-center gap-3">
          {orgDisplayName ? (
            <span className="text-sm font-medium truncate max-w-[260px]" style={{ color: brandColor }}>
              {orgDisplayName}
            </span>
          ) : null}
          <OrgSwitcher />
          {isSuperAdmin && <ViewAsToggle isSuperAdmin={true} />}
        </div>
      </div>
    </div>
  );
}

