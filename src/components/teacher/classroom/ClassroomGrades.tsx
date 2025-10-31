"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

export default function ClassroomGrades() {
    const cardRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!cardRef.current) return;
        gsap.fromTo(cardRef.current, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4 });
    }, []);
    return (
        <div ref={cardRef} className="rounded-lg border border-gray-200 dark:border-gray-800 p-4">
            <h2 className="text-base font-semibold mb-3">Bảng điểm</h2>
            <div className="text-sm text-gray-500">Bảng điểm sẽ xuất hiện tại đây.</div>
        </div>
    );
}


