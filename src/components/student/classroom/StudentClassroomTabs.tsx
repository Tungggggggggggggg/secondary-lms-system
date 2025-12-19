"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileText, GraduationCap, BookOpen } from "lucide-react";

type Props = {
    classId: string;
};

export default function StudentClassroomTabs({ classId }: Props) {
    const pathname = usePathname();
    const base = `/dashboard/student/classes/${classId}`;
    const isBase = pathname === base;

    const isLessons = pathname?.startsWith(`${base}/lessons`) ?? false;
    const isAssignments = pathname?.startsWith(`${base}/assignments`) ?? false;
    const isGrades = pathname?.startsWith(`${base}/grades`) ?? false;

    const pillClass = (active: boolean) =>
          [
            "relative inline-flex items-center gap-1.5 sm:gap-2 rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background after:absolute after:left-3 after:right-3 after:-bottom-1 after:h-0.5 after:rounded-full after:origin-center after:scale-x-0 after:transition-transform after:duration-200 after:content-['']",
            active
                ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-sm shadow-emerald-200 border border-green-500/80 after:bg-foreground/80 after:opacity-100 after:scale-x-100"
                : "text-muted-foreground border border-transparent hover:text-green-700 hover:bg-background/70 after:bg-green-500 after:opacity-0 after:scale-x-0",
        ].join(" ");

    return (
        <nav>
            <div className="inline-flex items-center gap-1 rounded-full bg-muted/40 px-1.5 py-1.5 border border-border shadow-sm hover:shadow-md backdrop-blur-sm transition-shadow duration-200">
                <Link prefetch className={pillClass(isBase)} href={base}>
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Tổng quan</span>
                </Link>
                <Link
                    prefetch
                    className={pillClass(isLessons)}
                    href={`${base}/lessons`}
                >
                    <BookOpen className="h-4 w-4" />
                    <span>Bài học</span>
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

