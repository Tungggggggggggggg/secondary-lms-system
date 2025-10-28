// src/components/layout/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
  role?: "student" | "teacher" | "parent";
}

export default function Sidebar({ role = "student" }: SidebarProps) {
  const pathname = usePathname();

  const menu =
    role === "student"
      ? [
          { icon: "📊", label: "Dashboard", href: "/student/dashboard" },
          { icon: "📚", label: "Lớp học", href: "/dashboard/student/classes" },
          { icon: "✍️", label: "Bài tập", href: "/dashboard/student/assignments" },
          { icon: "📈", label: "Điểm số", href: "/dashboard/student/grades" },
          { icon: "📅", label: "Lịch học", href: "/dashboard/student/schedule" },
          { icon: "⚙️", label: "Hồ sơ", href: "/dashboard/student/profile" },
        ]
      : [];

  return (
    <aside className="fixed left-0 top-0 h-full w-72 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white shadow-2xl z-50">
      <div className="p-6 relative h-full">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <span className="text-4xl">🎓</span>
          <span className="text-2xl font-extrabold bg-gradient-to-r from-yellow-300 to-yellow-400 bg-clip-text text-transparent">
            EduVerse
          </span>
        </div>

        {/* User Info */}
        <div className="bg-white/10 rounded-2xl p-4 mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-14 h-14 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full flex items-center justify-center text-2xl font-bold">
              HS
            </div>
            <div>
              <h3 className="font-bold text-lg">Nguyễn Văn A</h3>
              <p className="text-white/80 text-sm capitalize">{role}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-2">
          {menu.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${
                  active
                    ? "bg-white/30 shadow-lg"
                    : "hover:bg-white/20 text-white/90"
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="absolute bottom-6 left-6 right-6">
          <button className="w-full flex items-center gap-3 px-4 py-3 bg-red-500/20 rounded-xl font-semibold hover:bg-red-500/30 transition-all">
            <span className="text-xl">🚪</span>
            <span>Đăng xuất</span>
          </button>
        </div>
      </div>
    </aside>
  );
}