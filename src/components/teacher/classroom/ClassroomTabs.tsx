"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
    classroomId: string;
};

function tabClass(active: boolean) {
    return (
        "inline-block pb-2 text-sm border-b-2 " +
        (active
            ? "border-indigo-600 text-indigo-700 dark:text-indigo-400"
            : "border-transparent hover:border-indigo-500 hover:text-indigo-600")
    );
}

export default function ClassroomTabs({ classroomId }: Props) {
    const pathname = usePathname();
    const base = `/dashboard/teacher/classrooms/${classroomId}`;
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
                        className={tabClass(pathname?.startsWith(`${base}/assignments`) ?? false)}
                        href={`${base}/assignments`}
                    >
                        Bài tập
                    </Link>
                </li>
                <li>
                    <Link
                        prefetch
                        className={tabClass(pathname?.startsWith(`${base}/people`) ?? false)}
                        href={`${base}/people`}
                    >
                        Mọi người
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
            </ul>
        </nav>
    );
}


