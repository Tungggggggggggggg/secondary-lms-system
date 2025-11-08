"use client";
import { PropsWithChildren, useEffect, useRef } from "react";
import { gsap } from "gsap";

/**
 * Component AnimatedSection - Section với animation fade-in
 * Sử dụng GSAP để animate opacity và y position
 */
export default function AnimatedSection({ children, className }: PropsWithChildren<{ className?: string }>) {
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!ref.current) return;
    
    // Đảm bảo element có opacity ban đầu là 1 (visible)
    // Sử dụng autoAlpha thay vì opacity để GSAP tự động quản lý visibility
    gsap.set(ref.current, { opacity: 1, visibility: "visible" });
    
    // Animate từ opacity 0 và y: 8 về opacity 1 và y: 0
    const animation = gsap.from(ref.current, {
      opacity: 0,
      y: 8,
      duration: 0.35,
      ease: "power1.out",
      immediateRender: false, // Không render ngay lập tức
    });
    
    // Đảm bảo sau khi animation hoàn thành, opacity luôn là 1
    animation.eventCallback("onComplete", () => {
      if (ref.current) {
        gsap.set(ref.current, { opacity: 1, visibility: "visible" });
      }
    });
    
    // Cleanup: đảm bảo opacity luôn là 1 khi component unmount
    return () => {
      if (ref.current) {
        gsap.set(ref.current, { opacity: 1, visibility: "visible" });
      }
      animation.kill();
    };
  }, []);
  
  return (
    <div ref={ref} className={className} style={{ opacity: 1, visibility: "visible" }}>
      {children}
    </div>
  );
}


