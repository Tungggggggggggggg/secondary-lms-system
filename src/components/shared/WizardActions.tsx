"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WizardActionsProps {
  onBack: () => void;
  onNext: () => void;
  backLabel?: string;
  nextLabel?: string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export default function WizardActions({ onBack, onNext, backLabel = "← Quay lại", nextLabel = "Tiếp tục →", disabled, loading, className }: WizardActionsProps) {
  return (
    <div className={cn("flex items-center gap-2 flex-nowrap whitespace-nowrap shrink-0", className)}>
      <Button
        type="button"
        variant="outline"
        color="blue"
        className="h-10 sm:h-11 px-4 sm:px-6 whitespace-nowrap"
        onClick={onBack}
        aria-label="Quay lại"
      >
        {backLabel}
      </Button>
      <Button
        type="button"
        color="blue"
        className={cn("h-10 sm:h-11 px-4 sm:px-6 bg-gradient-to-r from-blue-500 to-indigo-600 text-white whitespace-nowrap", disabled || loading ? "opacity-60 cursor-not-allowed" : undefined)}
        onClick={onNext}
        disabled={disabled || loading}
        aria-label={nextLabel}
      >
        {nextLabel}
      </Button>
    </div>
  );
}
