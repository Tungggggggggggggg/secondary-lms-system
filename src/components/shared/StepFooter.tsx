"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";

interface StepFooterProps {
  canProceed: boolean;
  isFirst: boolean;
  isLast: boolean;
  onBack: () => void;
  onNext: () => void;
  onCreate?: () => void;
  current: number;
  total: number;
  className?: string;
  dense?: boolean;
  transparent?: boolean;
  position?: "sticky" | "fixed" | "static";
  lastLabel?: string;
}

export default function StepFooter({ canProceed, isFirst, isLast, onBack, onNext, onCreate, current, total, className, dense, transparent, position = "sticky", lastLabel }: StepFooterProps) {
  return (
    <div
      className={cn(
        position === "sticky" ? "sticky bottom-0 left-0 right-0" : undefined,
        position === "fixed" ? "fixed bottom-0 left-0 right-0" : undefined,
        position === "static" ? "w-full" : undefined,
        transparent ? "bg-transparent border-0 shadow-none" : "bg-white/95 backdrop-blur-md border-t shadow-[0_-2px_10px_rgba(0,0,0,0.06)]",
        dense ? "mt-4" : "mt-8",
        className
      )}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className={cn("max-w-6xl mx-auto px-4 flex justify-between items-center", dense ? "py-2" : "py-3")}
      >
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isFirst}
          className="flex items-center gap-2 min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại
        </Button>

        <div className="text-sm text-gray-600" aria-live="polite">
          Bước {current} / {total}
        </div>

        {isLast ? (
          <Button
            onClick={onCreate ?? onNext}
            disabled={!canProceed}
            className="flex items-center gap-2 min-h-[44px]"
          >
            <CheckCircle className="w-4 h-4" />
            {lastLabel ?? "Tạo bài tập"}
          </Button>
        ) : (
          <Button
            onClick={onNext}
            disabled={!canProceed}
            className="flex items-center gap-2 min-h-[44px]"
          >
            Tiếp theo
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
