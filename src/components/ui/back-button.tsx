"use client";

import { useRouter } from "next/navigation";
import { Button } from "./button";

/**
 * BackButton Props
 */
interface BackButtonProps {
  /**
   * Đường dẫn cụ thể để quay lại (optional)
   * Nếu không có, sẽ dùng router.back()
   */
  href?: string;
  
  /**
   * Label cho button
   */
  label?: string;
  
  /**
   * Custom className
   */
  className?: string;
  
  /**
   * Variant của button
   */
  variant?: "default" | "outline" | "ghost";
}

/**
 * BackButton Component
 * Button để quay lại trang trước
 * Hỗ trợ cả router.back() và custom href
 */
export default function BackButton({
  href,
  label = "Quay lại",
  className = "",
  variant = "ghost",
}: BackButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    if (href) {
      router.push(href);
    } else {
      router.back();
    }
  };

  return (
    <Button
      onClick={handleClick}
      variant={variant}
      className={`flex items-center gap-2 ${className}`}
    >
      <span>←</span>
      <span>{label}</span>
    </Button>
  );
}
