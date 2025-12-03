"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import type { ClassroomResponse } from "@/types/classroom";
import { createConversationGeneric } from "@/hooks/use-chat";
import { Users, MessageCircle } from "lucide-react";

type Props = {
    classroom: Pick<ClassroomResponse, "id" | "name" | "code" | "icon" | "teacher" | "_count">;
};

export default function StudentClassroomHeader({ classroom }: Props) {
    const headerRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const [isCreatingConversation, setIsCreatingConversation] = useState(false);

    useEffect(() => {
        if (!headerRef.current) return;
        gsap.fromTo(headerRef.current, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4 });
    }, []);

    const handleMessageTeacher = async () => {
        const teacherId = classroom.teacher?.id;
        if (!teacherId) return;
        try {
            setIsCreatingConversation(true);
            const res = await createConversationGeneric([teacherId], classroom.id);
            const id = res?.conversationId as string | undefined;
            if (id) {
                router.push(`/dashboard/student/messages?open=${encodeURIComponent(id)}`);
            }
        } catch (e) {
            console.error("[StudentClassroomHeader] createConversation error", e);
        } finally {
            setIsCreatingConversation(false);
        }
    };

    return (
        <div
            ref={headerRef}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-sky-100 via-indigo-50 to-violet-100 border border-indigo-100 px-4 sm:px-6 py-5 sm:py-6 shadow-sm hover:shadow-md transition-shadow duration-200"
        >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3 sm:gap-4 min-w-0">
                    <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-sky-500 to-emerald-300 text-xl sm:text-2xl text-white shadow-md flex-shrink-0">
                        <span>{classroom.icon || "📘"}</span>
                    </div>
                    <div className="space-y-1 min-w-0">
                        <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">
                            {classroom.name}
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-600 truncate">
                            GV: {classroom.teacher?.fullname || "Giáo viên"} • Mã: {classroom.code}
                        </p>
                        <p className="text-xs text-slate-500">
                            {classroom._count?.students ?? 0} học sinh
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 justify-start sm:justify-end flex-shrink-0">
                    <button
                        type="button"
                        disabled
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/70 px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 shadow-sm cursor-not-allowed opacity-70 hover:opacity-70 transition-opacity"
                    >
                        <Users className="h-4 w-4" />
                        <span className="hidden sm:inline">Danh sách học sinh</span>
                        <span className="sm:hidden">Danh sách</span>
                    </button>
                    {classroom.teacher && (
                        <button
                            type="button"
                            onClick={handleMessageTeacher}
                            disabled={isCreatingConversation}
                            className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-semibold text-white shadow-md hover:bg-indigo-700 hover:shadow-lg disabled:opacity-60 disabled:hover:bg-indigo-600 disabled:hover:shadow-md transition-all duration-200"
                        >
                            <MessageCircle className="h-4 w-4" />
                            <span className="hidden sm:inline">Nhắn giáo viên</span>
                            <span className="sm:hidden">Nhắn</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

