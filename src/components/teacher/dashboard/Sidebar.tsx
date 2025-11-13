"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useSidebarState } from "../../../hooks/useSidebarState";
import { isActivePath } from "../../../utils/routing";
import SidebarToggleButton from "../../shared/SidebarToggleButton";

export default function Sidebar() {
    const { data: session } = useSession();
    const pathname = usePathname();
    const { expanded, toggle } = useSidebarState("sidebar:teacher");

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
        { 
            icon: "🖥️", 
            label: "Giám sát thi", 
            href: "/dashboard/teacher/exams/monitor" 
        },
        { icon: "👥", label: "Học sinh", href: "/dashboard/teacher/students" },
        { icon: "📈", label: "Điểm số", href: "/dashboard/teacher/grades" },
        { icon: "⚙️", label: "Hồ sơ", href: "/dashboard/teacher/profile" },
    ];

    const isActive = (href: string) => isActivePath(pathname, href);

    return (
        <aside className={`fixed left-0 top-0 h-full ${expanded ? "w-72" : "w-20"} bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white shadow-2xl z-50 transition-[width] duration-300 ease-in-out`}>
            <div className="p-6">
                <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-3">
                        <span className="text-4xl">🎓</span>
                        {expanded && (
                            <span className="text-2xl font-extrabold bg-gradient-to-r from-yellow-300 to-yellow-400 bg-clip-text text-transparent">
                                EduVerse
                            </span>
                        )}
                    </div>
                    <SidebarToggleButton expanded={expanded} onToggle={toggle} ariaControls="teacher-sidebar" />
                </div>

                <div className="bg-white/10 rounded-2xl p-4 mb-8">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-14 h-14 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full flex items-center justify-center text-2xl font-bold">
                            {session?.user?.name?.charAt(0).toUpperCase() ||
                                "GV"}
                        </div>
                        {expanded && (
                            <div>
                                <h3 className="font-bold text-lg">
                                    {session?.user?.name || "Giáo viên"}
                                </h3>
                                <p className="text-white/80 text-sm">Giáo viên</p>
                            </div>
                        )}
                    </div>
                </div>

                <nav id="teacher-sidebar" className="space-y-2">
                    {menuItems.map((item, idx) => (
                        <Link
                            key={idx}
                            href={item.href}
                            title={!expanded ? item.label : undefined}
                            aria-label={!expanded ? item.label : undefined}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${
                                isActive(item.href)
                                    ? "bg-white/30 shadow-lg"
                                    : "hover:bg-white/20"
                            }`}
                        >
                            <span className="text-xl">{item.icon}</span>
                            {expanded && <span>{item.label}</span>}
                        </Link>
                    ))}
                </nav>

                <div className="absolute bottom-6 left-6 right-6">
                    <button
                        onClick={() => signOut({ callbackUrl: "/auth/login" })}
                        className="w-full flex items-center gap-3 px-4 py-3 bg-red-500/20 rounded-xl font-semibold hover:bg-red-500/30 transition-all"
                        title={!expanded ? "Đăng xuất" : undefined}
                        aria-label={!expanded ? "Đăng xuất" : undefined}
                    >
                        <span className="text-xl">🚪</span>
                        {expanded && <span>Đăng xuất</span>}
                    </button>
                </div>
            </div>
        </aside>
    );
}
