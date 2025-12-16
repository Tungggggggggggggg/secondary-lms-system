"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import type { ClassroomResponse } from "@/types/classroom";
import { createConversationGeneric } from "@/hooks/use-chat";
import { MessageCircle } from "lucide-react";

type Props = {
    classroom: Pick<ClassroomResponse, "id" | "name" | "icon" | "teacher" | "_count">;
};

export default function StudentClassroomHeader({ classroom }: Props) {
    const headerRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const [isCreatingConversation, setIsCreatingConversation] = useState(false);

    useEffect(() => {
        if (!headerRef.current) return;
        const reduce = typeof window !== "undefined" && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduce) {
            headerRef.current.style.opacity = "1";
            headerRef.current.style.transform = "none";
            return;
        }
        gsap.fromTo(headerRef.current, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4 });
    }, []);

    const handleMessageTeacher = async () => {
        const teacherId = classroom.teacher?.id;
        if (!teacherId) return;
        try {
            setIsCreatingConversation(true);
            const res = await createConversationGeneric([teacherId], classroom.id);
            const id =
                typeof res === "object" &&
                res !== null &&
                typeof (res as { conversationId?: unknown }).conversationId === "string"
                    ? (res as { conversationId: string }).conversationId
                    : undefined;
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
            className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-green-50 via-emerald-50 to-green-100 border border-green-100 px-4 sm:px-6 py-5 sm:py-6 shadow-sm hover:shadow-md transition-shadow duration-200"
        >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start min-w-0">
                    <div className="space-y-1 min-w-0">
                        <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">
                            {classroom.name}
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-600 truncate">
                            GV: {classroom.teacher?.fullname || "Giáo viên"}
                        </p>
                        <p className="text-xs text-slate-500">
                            {classroom._count?.students ?? 0} học sinh
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 justify-start sm:justify-end flex-shrink-0">
                    {classroom.teacher && (
                        <button
                            type="button"
                            onClick={handleMessageTeacher}
                            disabled={isCreatingConversation}
                            className="inline-flex items-center gap-1.5 rounded-full bg-green-600 px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-semibold text-white shadow-md hover:bg-green-700 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 disabled:opacity-60 disabled:hover:bg-green-600 disabled:hover:shadow-md transition-all duration-200"
                            aria-label="Nhắn giáo viên"
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

