"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileText, GraduationCap } from "lucide-react";

type Props = {
    classId: string;
};

export default function StudentClassroomTabs({ classId }: Props) {
    const pathname = usePathname();
    const base = `/dashboard/student/classes/${classId}`;
    const isBase = pathname === base;

    const isAssignments = pathname?.startsWith(`${base}/assignments`) ?? false;
    const isGrades = pathname?.startsWith(`${base}/grades`) ?? false;

    const pillClass = (active: boolean) =>
        [
            "inline-flex items-center gap-2 rounded-full px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium transition-colors",
            active
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-indigo-700 hover:bg-white/70",
        ].join(" ");

    return (
        <nav className="mt-6">
            <div className="inline-flex items-center gap-1 rounded-full bg-slate-100/80 px-1 py-1 border border-slate-200">
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

