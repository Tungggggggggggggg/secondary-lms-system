"use client";

import { usePathname } from "next/navigation";
import Breadcrumb, { BreadcrumbItem } from "@/components/ui/breadcrumb";
import { SUPER_ADMIN_NAV_ITEMS, ADMIN_NAV_ITEMS } from "@/lib/admin/admin-constants";
import { UserRole } from "@prisma/client";

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
  const navItems = isSuperAdmin ? SUPER_ADMIN_NAV_ITEMS : ADMIN_NAV_ITEMS;

  // Tạo breadcrumb items từ pathname
  const getBreadcrumbItems = (): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [
      { label: "Admin", href: "/dashboard/admin/overview" },
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
          members: "Thành viên",
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
    <div className={className}>
      {breadcrumbItems.length > 1 && (
        <Breadcrumb items={breadcrumbItems} className="mb-4" />
      )}
      {title && breadcrumbItems.length <= 1 && (
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{title}</h1>
      )}
    </div>
  );
}

