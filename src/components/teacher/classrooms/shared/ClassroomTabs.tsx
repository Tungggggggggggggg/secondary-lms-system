"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useRef } from "react";
import { LayoutDashboard, FileText, Users, GraduationCap } from "lucide-react";

type Props = {
    classroomId: string;
};

export default function ClassroomTabs({ classroomId }: Props) {
    const pathname = usePathname();
    const base = `/dashboard/teacher/classrooms/${classroomId}`;
    const isBase = pathname === base;
    const isAssignments = pathname?.startsWith(`${base}/assignments`) ?? false;
    const isPeople = pathname?.startsWith(`${base}/people`) ?? false;
    const isGrades = pathname?.startsWith(`${base}/grades`) ?? false;

    const tabs = useMemo(() => ([
        { href: base, label: "Tổng quan", active: isBase, Icon: LayoutDashboard },
        { href: `${base}/assignments`, label: "Bài tập", active: isAssignments, Icon: FileText },
        { href: `${base}/people`, label: "Mọi người", active: isPeople, Icon: Users },
        { href: `${base}/grades`, label: "Điểm số", active: isGrades, Icon: GraduationCap },
    ]), [base, isBase, isAssignments, isPeople, isGrades]);

    const containerRef = useRef<HTMLDivElement | null>(null);

    const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
        if (!containerRef.current) return;
        const links = Array.from(containerRef.current.querySelectorAll<HTMLAnchorElement>("a[role='tab']"));
        const currentIndex = links.findIndex((el) => el === document.activeElement);
        if (e.key === "ArrowRight") {
            e.preventDefault();
            const next = links[(currentIndex + 1 + links.length) % links.length];
            next?.focus();
        } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            const prev = links[(currentIndex - 1 + links.length) % links.length];
            prev?.focus();
        } else if (e.key === "Home") {
            e.preventDefault();
            links[0]?.focus();
        } else if (e.key === "End") {
            e.preventDefault();
            links[links.length - 1]?.focus();
        }
    };

    const pillClass = (active: boolean) =>
        [
            "relative inline-flex items-center gap-1.5 sm:gap-2 rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-50 after:absolute after:left-3 after:right-3 after:-bottom-1 after:h-0.5 after:rounded-full after:origin-center after:scale-x-0 after:transition-transform after:duration-200 after:content-['']",
            active
                ? "bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-sm shadow-blue-200 border border-blue-500/80 after:bg-white/80 after:opacity-100 after:scale-x-100"
                : "text-slate-600 border border-transparent hover:text-blue-700 hover:bg-white/70 after:bg-blue-500 after:opacity-0 after:scale-x-0",
        ].join(" ");

    return (
        <nav className="mt-6" aria-label="Điều hướng lớp học">
            <div
                ref={containerRef}
                role="tablist"
                onKeyDown={onKeyDown}
                className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-slate-50/80 via-slate-100/80 to-slate-50/80 px-1.5 py-1.5 border border-slate-200/80 shadow-sm hover:shadow-md backdrop-blur-sm transition-shadow duration-200"
            >
                {tabs.map(({ href, label, active, Icon }) => (
                    <Link
                        key={href}
                        prefetch
                        className={pillClass(active)}
                        href={href}
                        role="tab"
                        aria-selected={active}
                        aria-current={active ? "page" : undefined}
                        tabIndex={0}
                    >
                        <Icon className="h-4 w-4" />
                        <span>{label}</span>
                    </Link>
                ))}
            </div>
        </nav>
    );
}
