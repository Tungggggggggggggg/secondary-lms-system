"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
    classId: string;
};

function tabClass(active: boolean) {
    return (
        "inline-block pb-2 text-sm border-b-2 " +
        (active
            ? "border-indigo-600 text-indigo-700 dark:text-indigo-400"
            : "border-transparent hover:border-indigo-500 hover:text-indigo-600")
    );
}

export default function StudentClassroomTabs({ classId }: Props) {
    const pathname = usePathname();
    const base = `/dashboard/student/classes/${classId}`;
    const isBase = pathname === base;
    
    return (
        <nav className="mt-4 border-b border-gray-200 dark:border-gray-800">
            <ul className="-mb-px flex gap-6">
                <li>
                    <Link prefetch className={tabClass(isBase)} href={base}>
                        Tổng quan
                    </Link>
                </li>
                <li>
                    <Link
                        prefetch
                        className={tabClass(pathname?.startsWith(`${base}/courses`) ?? false)}
                        href={`${base}/courses`}
                    >
                        Bài học
                    </Link>
                </li>
                <li>
                    <Link
                        prefetch
                        className={tabClass(pathname?.startsWith(`${base}/assignments`) ?? false)}
                        href={`${base}/assignments`}
                    >
                        Bài tập
                    </Link>
                </li>
                <li>
                    <Link
                        prefetch
                        className={tabClass(pathname?.startsWith(`${base}/grades`) ?? false)}
                        href={`${base}/grades`}
                    >
                        Điểm số
                    </Link>
                </li>
                <li>
                    <Link
                        prefetch
                        className={tabClass(pathname?.startsWith(`${base}/discussions`) ?? false)}
                        href={`${base}/discussions`}
                    >
                        Thảo luận
                    </Link>
                </li>
            </ul>
        </nav>
    );
}

