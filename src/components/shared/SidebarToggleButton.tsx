"use client";

import { useEffect, useRef, useState } from "react";

interface SidebarToggleButtonProps {
  expanded: boolean;
  onToggle: () => void;
  ariaControls: string;
}

// Nút toggle sidebar: hỗ trợ ARIA, bàn phím, và micro-interaction bằng GSAP.
export default function SidebarToggleButton({ expanded, onToggle, ariaControls }: SidebarToggleButtonProps) {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const [gsap, setGsap] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    // Import động GSAP để tránh SSR issues
    import("gsap")
      .then((mod) => {
        if (mounted) setGsap(mod.gsap || mod);
      })
      .catch(() => {
        // Không có GSAP vẫn hoạt động bình thường (fallback bằng CSS transitions)
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!gsap || !btnRef.current) return;
    try {
      gsap.to(btnRef.current, {
        keyframes: [
          { scale: 0.94, duration: 0.08 },
          { scale: 1, duration: 0.18 },
        ],
        ease: "power2.out",
      });
    } catch (error) {
      console.error("Sidebar: gsap toggle animation error", error);
    }
  }, [expanded, gsap]);

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={onToggle}
      aria-label="Thu gọn/Mở rộng sidebar"
      aria-expanded={expanded}
      aria-controls={ariaControls}
      className="mb-4 inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 transition-colors"
    >
      <span className="text-lg" aria-hidden>
        {expanded ? "«" : "»"}
      </span>
    </button>
  );
}


