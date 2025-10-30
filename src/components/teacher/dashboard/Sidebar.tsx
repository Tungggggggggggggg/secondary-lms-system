"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";

export default function Sidebar() {
    const { data: session } = useSession();
    const pathname = usePathname();

    const menuItems = [
        {
            icon: "📊",
            label: "Dashboard",
            href: "/dashboard/teacher/dashboard",
        },
        { icon: "🏫", label: "Lớp học", href: "/dashboard/teacher/classrooms" },
        {
            icon: "✍️",
            label: "Bài tập",
            href: "/dashboard/teacher/assignments",
        },
        { icon: "👥", label: "Học sinh", href: "/dashboard/teacher/students" },
        { icon: "📈", label: "Điểm số", href: "/dashboard/teacher/grades" },
        { icon: "⚙️", label: "Hồ sơ", href: "/dashboard/teacher/profile" },
    ];

    const isActive = (href: string) => pathname === href;

    return (
        <aside className="fixed left-0 top-0 h-full w-72 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white shadow-2xl z-50">
            <div className="p-6">
                <div className="flex items-center gap-3 mb-10">
                    <span className="text-4xl">🎓</span>
                    <span className="text-2xl font-extrabold bg-gradient-to-r from-yellow-300 to-yellow-400 bg-clip-text text-transparent">
                        EduVerse
                    </span>
                </div>

                <div className="bg-white/10 rounded-2xl p-4 mb-8">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-14 h-14 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full flex items-center justify-center text-2xl font-bold">
                            {session?.user?.name?.charAt(0).toUpperCase() ||
                                "GV"}
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">
                                {session?.user?.name || "Giáo viên"}
                            </h3>
                            <p className="text-white/80 text-sm">Giáo viên</p>
                        </div>
                    </div>
                </div>

                <nav className="space-y-2">
                    {menuItems.map((item, idx) => (
                        <Link
                            key={idx}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${
                                isActive(item.href)
                                    ? "bg-white/30 shadow-lg"
                                    : "hover:bg-white/20"
                            }`}
                        >
                            <span className="text-xl">{item.icon}</span>
                            <span>{item.label}</span>
                        </Link>
                    ))}
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
