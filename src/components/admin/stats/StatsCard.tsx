"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { cn } from "@/lib/utils";
import { StatsCardProps } from "@/types/admin";
import { formatNumber, formatCompactNumber } from "@/lib/admin/format-number";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

/**
 * Component StatsCard - Hiển thị metric card với số liệu thống kê
 * Hỗ trợ animated numbers, trend indicators, và icons
 */
export default function StatsCard({
  title,
  value,
  icon,
  trend,
  description,
  color = "default",
}: StatsCardProps) {
  const valueRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Color variants
  const colorClasses = {
    default: "bg-white border-gray-200",
    primary: "bg-violet-50 border-violet-200",
    success: "bg-green-50 border-green-200",
    warning: "bg-amber-50 border-amber-200",
    danger: "bg-red-50 border-red-200",
    info: "bg-blue-50 border-blue-200",
  };

  const iconColorClasses = {
    default: "text-violet-600 bg-violet-100",
    primary: "text-violet-600 bg-violet-200",
    success: "text-green-600 bg-green-200",
    warning: "text-amber-600 bg-amber-200",
    danger: "text-red-600 bg-red-200",
    info: "text-blue-600 bg-blue-200",
  };

  // Animation khi component mount
  useEffect(() => {
    if (cardRef.current) {
      // Đảm bảo element có opacity ban đầu là 1 (visible)
      gsap.set(cardRef.current, { opacity: 1, visibility: "visible" });
      
      // Animate từ opacity 0 và y: 20 về opacity 1 và y: 0
      const animation = gsap.from(cardRef.current, {
        y: 20,
        opacity: 0,
        duration: 0.4,
        ease: "power2.out",
        immediateRender: false, // Không render ngay lập tức
      });
      
      // Đảm bảo sau khi animation hoàn thành, opacity luôn là 1
      animation.eventCallback("onComplete", () => {
        if (cardRef.current) {
          gsap.set(cardRef.current, { opacity: 1, visibility: "visible" });
        }
      });
      
      // Cleanup: đảm bảo opacity luôn là 1 khi component unmount
      return () => {
        if (cardRef.current) {
          gsap.set(cardRef.current, { opacity: 1, visibility: "visible" });
        }
        animation.kill();
      };
    }
  }, []);

  // Animate number khi value thay đổi
  useEffect(() => {
    if (valueRef.current && typeof value === "number") {
      const targetValue = value;
      const duration = 1;
      const startValue = 0;

      gsap.to(valueRef.current, {
        innerText: targetValue,
        duration,
        snap: { innerText: 1 },
        onUpdate: function () {
          const currentValue = Math.floor(
            startValue + (targetValue - startValue) * this.progress()
          );
          if (valueRef.current) {
            valueRef.current.innerText = formatCompactNumber(currentValue);
          }
        },
        ease: "power2.out",
      });
    }
  }, [value]);

  // Format value
  const formatValue = () => {
    if (typeof value === "number") {
      if (value >= 1000000) {
        return formatCompactNumber(value);
      }
      return formatNumber(value);
    }
    return value;
  };

  // Render trend indicator
  const renderTrend = () => {
    if (!trend) return null;

    const isPositive = trend.direction === "up";
    const isNeutral = trend.direction === "neutral";

    return (
      <div
        className={cn(
          "flex items-center gap-1 text-xs font-medium",
          isPositive && "text-green-600",
          !isPositive && !isNeutral && "text-red-600",
          isNeutral && "text-gray-600"
        )}
      >
        {isPositive && <TrendingUp className="h-4 w-4" />}
        {!isPositive && !isNeutral && <TrendingDown className="h-4 w-4" />}
        {isNeutral && <Minus className="h-4 w-4" />}
        <span>{Math.abs(trend.value)}%</span>
      </div>
    );
  };

  return (
    <div
      ref={cardRef}
      className={cn(
        "rounded-xl border p-6 transition-all duration-200 hover:shadow-md",
        colorClasses[color]
      )}
      style={{ opacity: 1, visibility: "visible" }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            {icon && (
              <div
                className={cn(
                  "p-2 rounded-lg",
                  iconColorClasses[color]
                )}
              >
                {icon}
              </div>
            )}
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <div className="flex items-baseline gap-2 mt-1">
                <p
                  ref={typeof value === "number" ? valueRef : undefined}
                  className="text-3xl font-bold text-gray-900"
                >
                  {typeof value === "number" ? formatValue() : value}
                </p>
                {trend && renderTrend()}
              </div>
              {description && (
                <p className="text-xs text-gray-500 mt-2">{description}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

