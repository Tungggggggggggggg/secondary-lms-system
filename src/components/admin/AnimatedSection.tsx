"use client";
import { PropsWithChildren, useEffect, useRef } from "react";
import { gsap } from "gsap";

export default function AnimatedSection({ children, className }: PropsWithChildren<{ className?: string }>) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    gsap.from(ref.current, { opacity: 0, y: 8, duration: 0.35, ease: "power1.out" });
  }, []);
  return (
    <div ref={ref} className={className}>{children}</div>
  );
}


