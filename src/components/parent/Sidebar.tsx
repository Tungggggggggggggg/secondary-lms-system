// src/components/layout/SidebarParent.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

export default function SidebarParent() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const menu = [
    { icon: "📊", label: "Dashboard", href: "/dashboard/parent/dashboard" },
    { icon: "👨‍👩‍👧", label: "Con của tôi", href: "/parent/children" },
    { icon: "📈", label: "Tiến độ học tập", href: "/parent/progress" },
    { icon: "📅", label: "Lịch học", href: "/parent/schedule" },
    { icon: "💬", label: "Liên hệ GV", href: "/parent/contact" },
    { icon: "⚙️", label: "Hồ sơ", href: "/dashboard/parent/profile" },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-72 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white shadow-2xl z-50">
      <div className="p-6 relative h-full">
        <div className="flex items-center gap-3 mb-10">
          <span className="text-4xl">🎓</span>
          <span className="text-2xl font-extrabold bg-gradient-to-r from-yellow-300 to-yellow-400 bg-clip-text text-transparent">
            EduVerse
          </span>
        </div>

        <div className="bg-white/10 rounded-2xl p-4 mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-14 h-14 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full flex items-center justify-center text-2xl font-bold">
              {session?.user?.name?.charAt(0).toUpperCase() || "PH"}
            </div>
            <div>
              <h3 className="font-bold text-lg">{session?.user?.name || "Phụ huynh"}</h3>
              <p className="text-white/80 text-sm">Phụ huynh</p>
            </div>
          </div>
        </div>

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

        <div className="absolute bottom-6 left-6 right-6">
          <button
            onClick={() => signOut({ callbackUrl: "/auth/login" })}
            className="w-full flex items-center gap-3 px-4 py-3 bg-red-500/20 rounded-xl font-semibold hover:bg-red-500/30 transition-all"
          >
            <span className="text-xl">🚪</span>
            <span>Đăng xuất</span>
          </button>
        </div>
      </div>
    </aside>
  );
}