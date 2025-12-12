"use client";

import { usePathname } from "next/navigation";
import Breadcrumb, { BreadcrumbItem } from "@/components/ui/breadcrumb";

interface Props {
  role: "teacher" | "student" | "parent" | "admin";
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
  const roleIndex = parts.findIndex((p) => ["teacher", "student", "parent", "admin"].includes(p));
  if (roleIndex === -1) return null;

  const items: BreadcrumbItem[] = [];
  const baseHref = "/" + parts.slice(0, roleIndex + 2).join("/");
  const roleLabel: Record<Props["role"], string> = {
    teacher: "Giáo viên",
    student: "Học sinh",
    parent: "Phụ huynh",
    admin: "Quản trị viên",
  };
  items.push({ label: roleLabel[role], href: baseHref });

  const rest = parts.slice(roleIndex + 2);
  let accPath = baseHref;
  rest.forEach((seg, idx) => {
    accPath += "/" + seg;
    const isLast = idx === rest.length - 1;
    items.push({ label: mapLabel(role, seg), href: isLast ? undefined : accPath });
  });

  return <Breadcrumb items={items} className={className} />;
}
