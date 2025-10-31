"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

export default function ClassroomPeople() {
    const rootRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!rootRef.current) return;
        gsap.fromTo(
            rootRef.current.querySelectorAll("section"),
            { opacity: 0, y: 10 },
            { opacity: 1, y: 0, duration: 0.4, stagger: 0.08, ease: "power1.out" }
        );
    }, []);
    return (
        <div ref={rootRef} className="grid gap-6 md:grid-cols-2">
            <section className="rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                <h2 className="text-base font-semibold mb-3">Giáo viên</h2>
                <div className="text-sm text-gray-500">Danh sách giáo viên sẽ xuất hiện tại đây.</div>
            </section>
            <section className="rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                <h2 className="text-base font-semibold mb-3">Học sinh</h2>
                <div className="text-sm text-gray-500">Danh sách học sinh sẽ xuất hiện tại đây.</div>
            </section>
        </div>
    );
}


