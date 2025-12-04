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
  color?: "violet" | "amber" | "blue" | "green";
}

/**
 * Breadcrumb Component
 * Hiển thị đường dẫn navigation dạng breadcrumb
 * Hỗ trợ click vào các item để navigate
 */
export default function Breadcrumb({ items, className = "", color = "blue" }: BreadcrumbProps) {
  const pathname = usePathname();

  // Không hiển thị nếu chỉ có 1 item hoặc không có item nào
  if (!items || items.length <= 1) {
    return null;
  }

  const linkBase =
    "rounded-lg px-2 py-1 -mx-1 -my-1 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2";
  const linkStyles: Record<string, string> = {
    violet: "hover:text-violet-600 hover:bg-violet-50 focus-visible:ring-violet-500",
    amber: "hover:text-amber-700 hover:bg-amber-50 focus-visible:ring-amber-500",
    blue: "hover:text-indigo-600 hover:bg-indigo-50 focus-visible:ring-indigo-500",
    green: "hover:text-green-700 hover:bg-green-50 focus-visible:ring-green-500",
  };

  return (
    <nav
      className={`flex items-center gap-2 text-sm text-gray-600 mb-2 ${className}`}
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
                className={`${linkBase} ${linkStyles[color]}`}
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
                aria-current={isLast ? "page" : undefined}
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
