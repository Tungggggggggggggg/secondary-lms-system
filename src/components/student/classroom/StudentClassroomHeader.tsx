"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import type { ClassroomResponse } from "@/types/classroom";
import { createConversationGeneric } from "@/hooks/use-chat";

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
        <div ref={headerRef} className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white p-6 shadow">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-white/15 flex items-center justify-center">
                        <span className="text-lg">{classroom.icon || "📘"}</span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-semibold">{classroom.name}</h1>
                        <p className="opacity-90 text-sm">
                            GV: {classroom.teacher?.fullname || "Giáo viên"} • Mã lớp: {classroom.code}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="rounded-md bg-white/10 px-3 py-1.5 text-sm">
                        {classroom._count?.students ?? 0} học sinh
                    </span>
                    {classroom.teacher && (
                        <button
                            type="button"
                            onClick={handleMessageTeacher}
                            disabled={isCreatingConversation}
                            className="inline-flex items-center rounded-md bg-white text-indigo-600 px-3 py-1.5 text-sm font-semibold shadow hover:bg-gray-100 disabled:opacity-60"
                        >
                            Nhắn giáo viên
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

