"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * BreadcrumbItem - Item trong breadcrumb navigation
 */
export interface BreadcrumbItem {
  label: string;
  href?: string;
}

/**
 * Breadcrumb Props
 */
interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * Breadcrumb Component
 * Hiển thị đường dẫn navigation dạng breadcrumb
 * Hỗ trợ click vào các item để navigate
 */
export default function Breadcrumb({ items, className = "" }: BreadcrumbProps) {
  const pathname = usePathname();

  // Không hiển thị nếu chỉ có 1 item hoặc không có item nào
  if (!items || items.length <= 1) {
    return null;
  }

  return (
    <nav
      className={`flex items-center gap-2 text-sm text-gray-600 mb-4 ${className}`}
      aria-label="Breadcrumb"
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const isActive = pathname === item.href;

        return (
          <div key={index} className="flex items-center gap-2">
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="hover:text-indigo-600 transition-colors duration-200"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={`${
                  isLast || isActive
                    ? "text-gray-900 font-semibold"
                    : "text-gray-600"
                }`}
              >
                {item.label}
              </span>
            )}
            {!isLast && (
              <span className="text-gray-400" aria-hidden="true">/</span>
            )}
          </div>
        );
      })}
    </nav>
  );
}
