"use client";

import { usePathname } from "next/navigation";
import Breadcrumb, { BreadcrumbItem } from "@/components/ui/breadcrumb";
import { ADMIN_NAV_ITEMS, SUPER_ADMIN_NAV_ITEMS } from "@/lib/admin/admin-constants";

interface Props {
  role: "admin" | "teacher" | "student" | "parent";
  className?: string;
}

function mapLabel(role: Props["role"], segment: string): string {
  const mapCommon: Record<string, string> = {
    dashboard: "Dashboard",
    classrooms: "Lớp học",
    classes: "Lớp học",
    messages: "Tin nhắn",
    assignments: "Bài tập",
    exams: "Kỳ thi",
    monitor: "Giám sát thi",
    students: "Học sinh",
    grades: "Điểm số",
    profile: "Hồ sơ",
    family: "Gia đình",
    children: "Con của tôi",
    progress: "Tiến độ học tập",
    system: "Hệ thống",
    settings: "Cài đặt",
    users: "Người dùng",
    org: "Tổ chức",
    members: "Thành viên tổ chức",
    moderation: "Kiểm duyệt",
    reports: "Báo cáo",
    audit: "Audit Logs",
    bulk: "Tạo hàng loạt",
    overview: "Tổng quan",
  };
  const label = mapCommon[segment];
  if (label) return label;
  return segment;
}

export default function TopbarBreadcrumbs({ role, className }: Props) {
  const pathname = usePathname();
  if (!pathname) return null;

  const parts = pathname.split("/").filter(Boolean);
  const roleIndex = parts.findIndex((p) => ["admin", "teacher", "student", "parent"].includes(p));
  if (roleIndex === -1) return null;

  const items: BreadcrumbItem[] = [];
  const baseHref = "/" + parts.slice(0, roleIndex + 2).join("/");
  const roleLabel: Record<Props["role"], string> = {
    admin: "Admin",
    teacher: "Giáo viên",
    student: "Học sinh",
    parent: "Phụ huynh",
  };
  items.push({ label: roleLabel[role], href: baseHref });

  const rest = parts.slice(roleIndex + 2);
  let accPath = baseHref;

  if (role === "admin") {
    const all = [...SUPER_ADMIN_NAV_ITEMS, ...ADMIN_NAV_ITEMS];
    const active = all.find((it) => (it.href === "/dashboard/admin/overview" ? pathname === it.href : pathname.startsWith(it.href)));
    if (active && active.href !== "/dashboard/admin/overview") {
      items.push({ label: active.label, href: active.href });
      const sub = parts.slice(active.href.split("/").filter(Boolean).length);
      if (sub.length) items.push({ label: mapLabel(role, sub[sub.length - 1]) });
      return <Breadcrumb items={items} className={className} />;
    }
  }

  rest.forEach((seg, idx) => {
    accPath += "/" + seg;
    const isLast = idx === rest.length - 1;
    items.push({ label: mapLabel(role, seg), href: isLast ? undefined : accPath });
  });

  return <Breadcrumb items={items} className={className} />;
}
