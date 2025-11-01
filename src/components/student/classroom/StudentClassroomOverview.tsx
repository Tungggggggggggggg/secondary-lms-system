"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

export default function StudentClassroomOverview() {
    const rootRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!rootRef.current) return;
        gsap.fromTo(
            rootRef.current.querySelectorAll("section,aside"),
            { opacity: 0, y: 10 },
            {
                opacity: 1,
                y: 0,
                duration: 0.4,
                stagger: 0.08,
                ease: "power1.out",
            }
        );
    }, []);
    
    return (
        <div ref={rootRef} className="grid gap-6 md:grid-cols-3">
            <section className="md:col-span-2 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                <h2 className="text-base font-semibold mb-3">Bảng tin</h2>
                <div className="text-sm text-gray-500">
                    Thông báo và hoạt động gần đây sẽ xuất hiện tại đây nha~
                </div>
            </section>
            <aside className="rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                <h3 className="text-base font-semibold mb-3">Sắp tới</h3>
                <div className="text-sm text-gray-500">
                    Chưa có hoạt động nào nhé~
                </div>
            </aside>
        </div>
    );
}

