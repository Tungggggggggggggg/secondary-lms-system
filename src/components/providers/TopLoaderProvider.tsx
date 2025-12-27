"use client";

import NextTopLoader from "nextjs-toploader";
import { usePathname } from "next/navigation";

type RoleTheme = "teacher" | "student" | "parent" | "admin" | "default";

function getRoleThemeFromPathname(pathname: string | null): RoleTheme {
  if (!pathname) return "default";
  if (pathname.startsWith("/dashboard/teacher")) return "teacher";
  if (pathname.startsWith("/dashboard/student")) return "student";
  if (pathname.startsWith("/dashboard/parent")) return "parent";
  if (pathname.startsWith("/dashboard/admin")) return "admin";
  return "default";
}

function getColorForRole(role: RoleTheme): string {
  switch (role) {
    case "teacher":
      return "#2563EB"; // blue-600
    case "student":
      return "#16A34A"; // green-600
    case "parent":
      return "#D97706"; // amber-600
    case "admin":
      return "#7C3AED"; // violet-600
    default:
      return "#0F172A"; // slate-900
  }
}

/**
 * Hiển thị thanh progress khi chuyển route (AJAX look) trên toàn site.
 * Input: none
 * Output: JSX provider component
 * Side effects: Lắng nghe route changes thông qua NextTopLoader.
 */
export default function TopLoaderProvider() {
  const pathname = usePathname();
  const role = getRoleThemeFromPathname(pathname);
  const color = getColorForRole(role);

  return (
    <NextTopLoader
      color={color}
      height={3}
      showSpinner={false}
      easing="ease"
      speed={200}
      shadow={false}
      zIndex={9999}
    />
  );
}
