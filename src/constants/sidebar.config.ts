import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Briefcase,
  LayoutDashboard,
  School,
  MessagesSquare,
  NotebookPen,
  MonitorCheck,
  Users,
  BarChart3,
  Settings,
  Home,
  GraduationCap,
  UserSquare2,
} from "lucide-react";

export type DashboardRole = "teacher" | "student" | "parent" | "admin";

export interface SidebarItemConfig {
  icon: LucideIcon;
  label: string;
  href: string;
}

export interface SidebarGroupConfig {
  title: string;
  items: SidebarItemConfig[];
}

export type SidebarConfig = Record<DashboardRole, SidebarGroupConfig[]>;

export const sidebarConfig: SidebarConfig = {
  teacher: [
    {
      title: "Tổng quan",
      items: [
        { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard/teacher/dashboard" },
      ],
    },
    {
      title: "Lớp & Bài tập",
      items: [
        { icon: School, label: "Lớp học", href: "/dashboard/teacher/classrooms" },
        { icon: BookOpen, label: "Khóa học", href: "/dashboard/teacher/courses" },
        { icon: NotebookPen, label: "Bài tập", href: "/dashboard/teacher/assignments" },
        { icon: MonitorCheck, label: "Giám sát thi", href: "/dashboard/teacher/exams/monitor" },
      ],
    },
    {
      title: "Liên lạc & Quản lý",
      items: [
        { icon: MessagesSquare, label: "Tin nhắn", href: "/dashboard/teacher/messages" },
        { icon: Users, label: "Học sinh", href: "/dashboard/teacher/students" },
      ],
    },
    {
      title: "Tài khoản",
      items: [
        { icon: Settings, label: "Hồ sơ", href: "/dashboard/teacher/profile" },
      ],
    },
  ],
  student: [
    {
      title: "Tổng quan",
      items: [
        { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard/student/dashboard" },
      ],
    },
    {
      title: "Lớp & Bài tập",
      items: [
        { icon: School, label: "Lớp học", href: "/dashboard/student/classes" },
        { icon: NotebookPen, label: "Bài tập", href: "/dashboard/student/assignments" },
        { icon: BarChart3, label: "Điểm số", href: "/dashboard/student/grades" },
      ],
    },
    {
      title: "Liên lạc & Gia đình",
      items: [
        { icon: MessagesSquare, label: "Tin nhắn", href: "/dashboard/student/messages" },
        { icon: UserSquare2, label: "Gia đình", href: "/dashboard/student/family" },
      ],
    },
    {
      title: "Tài khoản",
      items: [
        { icon: Settings, label: "Hồ sơ", href: "/dashboard/student/profile" },
      ],
    },
  ],
  parent: [
    {
      title: "Tổng quan",
      items: [
        { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard/parent/dashboard" },
      ],
    },
    {
      title: "Theo dõi",
      items: [
        { icon: GraduationCap, label: "Con của tôi", href: "/dashboard/parent/children" },
        { icon: Home, label: "Giáo viên", href: "/dashboard/parent/teachers" },
        { icon: BarChart3, label: "Tiến độ học tập", href: "/dashboard/parent/progress" },
      ],
    },
    {
      title: "Liên lạc",
      items: [
        { icon: MessagesSquare, label: "Tin nhắn", href: "/dashboard/parent/messages" },
      ],
    },
    {
      title: "Tài khoản",
      items: [
        { icon: Settings, label: "Hồ sơ", href: "/dashboard/parent/profile" },
      ],
    },
  ],
  admin: [
    {
      title: "Tổng quan",
      items: [
        { icon: LayoutDashboard, label: "Overview", href: "/dashboard/admin/dashboard" },
      ],
    },
    {
      title: "Người dùng & Lớp học",
      items: [
        { icon: Users, label: "Users", href: "/dashboard/admin/users" },
        { icon: Briefcase, label: "Organizations", href: "/dashboard/admin/organizations" },
        { icon: School, label: "Classes", href: "/dashboard/admin/classrooms" },
      ],
    },
    {
      title: "Giám sát & Cấu hình",
      items: [
        { icon: BarChart3, label: "Audit Logs", href: "/dashboard/admin/audit-logs" },
        { icon: Settings, label: "System Settings", href: "/dashboard/admin/settings" },
      ],
    },
  ],
};
