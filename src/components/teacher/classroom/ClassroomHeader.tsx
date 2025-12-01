"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import type { ClassroomResponse } from "@/types/classroom";
import { Users, FileText } from "lucide-react";

type Props = {
    classroom: Pick<ClassroomResponse, "id" | "name" | "code" | "icon" | "teacher" | "_count">;
};

export default function ClassroomHeader({ classroom }: Props) {
    const headerRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        if (!headerRef.current) return;
        gsap.fromTo(headerRef.current, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4 });
    }, []);

    const handleViewStudents = () => {
        router.push(`/dashboard/teacher/classrooms/${classroom.id}/people`);
    };

    const handleGoAssignments = () => {
        router.push(`/dashboard/teacher/classrooms/${classroom.id}/assignments`);
    };

    return (
        <div
            ref={headerRef}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-100 via-indigo-50 to-violet-100 border border-indigo-50 px-5 py-5 sm:px-7 sm:py-6 shadow-[0_18px_40px_rgba(15,23,42,0.12)]"
        >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-sky-500 to-emerald-300 text-2xl text-white shadow-md">
                        <span>{classroom.icon || "📘"}</span>
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-lg sm:text-2xl font-semibold text-slate-900">
                            {classroom.name}
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-600">
                            GV: {classroom.teacher?.fullname || "Giáo viên"} • Mã lớp: {classroom.code}
                        </p>
                        <p className="text-[11px] text-slate-500">
                            {classroom._count?.students ?? 0} học sinh đang theo học
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3 justify-start sm:justify-end">
                    <button
                        type="button"
                        onClick={handleViewStudents}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 shadow-sm hover:bg-white"
                    >
                        <Users className="h-4 w-4" />
                        <span>Danh sách học sinh</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleGoAssignments}
                        className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white shadow-md hover:bg-indigo-700"
                    >
                        <FileText className="h-4 w-4" />
                        <span>Quản lý bài tập</span>
                    </button>
                </div>
            </div>
        </div>
    );
}


