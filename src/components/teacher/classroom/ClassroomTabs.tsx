"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

    const pillClass = (active: boolean) =>
        [
            "relative inline-flex items-center gap-1.5 sm:gap-2 rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-50 after:absolute after:left-3 after:right-3 after:-bottom-1 after:h-0.5 after:rounded-full after:origin-center after:scale-x-0 after:transition-transform after:duration-200 after:content-['']",
            active
                ? "bg-gradient-to-r from-indigo-500 to-sky-500 text-white shadow-sm shadow-indigo-200 border border-indigo-500/80 after:bg-white/80 after:opacity-100 after:scale-x-100"
                : "text-slate-600 border border-transparent hover:text-indigo-700 hover:bg-white/70 after:bg-indigo-500 after:opacity-0 after:scale-x-0",
        ].join(" ");

    return (
        <nav className="mt-6">
            <div className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-slate-50/80 via-slate-100/80 to-slate-50/80 px-1.5 py-1.5 border border-slate-200/80 shadow-sm hover:shadow-md backdrop-blur-sm transition-shadow duration-200">
                <Link prefetch className={pillClass(isBase)} href={base}>
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Tổng quan</span>
                </Link>
                <Link
                    prefetch
                    className={pillClass(isAssignments)}
                    href={`${base}/assignments`}
                >
                    <FileText className="h-4 w-4" />
                    <span>Bài tập</span>
                </Link>
                <Link
                    prefetch
                    className={pillClass(isPeople)}
                    href={`${base}/people`}
                >
                    <Users className="h-4 w-4" />
                    <span>Mọi người</span>
                </Link>
                <Link
                    prefetch
                    className={pillClass(isGrades)}
                    href={`${base}/grades`}
                >
                    <GraduationCap className="h-4 w-4" />
                    <span>Điểm số</span>
                </Link>
            </div>
        </nav>
    );
}


