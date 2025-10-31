"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import type { ClassroomResponse } from "@/types/classroom";

type Props = {
    classroom: Pick<ClassroomResponse, "id" | "name" | "code" | "icon" | "_count">;
};

export default function ClassroomHeader({ classroom }: Props) {
    const headerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!headerRef.current) return;
        gsap.fromTo(headerRef.current, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4 });
    }, []);

    return (
        <div ref={headerRef} className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white p-6 shadow">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-white/15 flex items-center justify-center">
                        <span className="text-lg">{classroom.icon || "📘"}</span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-semibold">{classroom.name}</h1>
                        <p className="opacity-90 text-sm">Mã lớp: {classroom.code}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="rounded-md bg-white/10 px-3 py-1.5 text-sm">{classroom._count?.students ?? 0} học sinh</span>
                </div>
            </div>
        </div>
    );
}


