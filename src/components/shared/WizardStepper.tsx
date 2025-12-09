"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

type StepItem = { id: number; label: string };

interface WizardStepperProps {
  steps: StepItem[];
  current: number;
  onStepClick?: (id: number) => void;
  className?: string;
  sticky?: boolean;
  size?: "sm" | "md";
  allowFutureNavigation?: boolean;
}

export default function WizardStepper({ steps, current, onStepClick, className, sticky, size = "md", allowFutureNavigation = false }: WizardStepperProps) {
  const circleSize = size === "sm" ? "h-10 w-10" : "h-12 w-12";
  const connectorWidth = size === "sm" ? "w-8" : "w-10";
  const columns = steps.length * 2 - 1;

  return (
    <nav aria-label="Wizard steps" className={cn("w-full", sticky ? "sticky top-0 z-20 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60" : undefined, className)}>
      <div className="flex flex-col items-stretch">
        {/* Row 1: circles + connectors, sử dụng grid cột: circle|line|circle|line|... */}
        <div
          className="grid items-center justify-center"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {steps.map((s, idx) => {
            const active = s.id === current;
            const done = s.id < current;
            const hasHandler = typeof onStepClick === 'function';
            const canClick = hasHandler && (allowFutureNavigation ? true : s.id <= current);
            const circleCol = idx * 2 + 1;
            const connCol = idx * 2 + 2;
            return (
              <React.Fragment key={s.id}>
                <div key={`circle-${s.id}`} style={{ gridColumn: `${circleCol} / span 1` }} className="justify-self-center">
                  <button
                    type="button"
                    aria-current={active ? "step" : undefined}
                    aria-label={`Bước ${s.id}: ${s.label}`}
                    onClick={() => canClick && onStepClick && onStepClick(s.id)}
                    disabled={!canClick}
                    className={cn(
                      "rounded-full grid place-items-center text-sm font-bold shadow-sm transition-transform",
                      circleSize,
                      done ? "bg-blue-600 text-white" : undefined,
                      active && !done ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md" : undefined,
                      !active && !done ? "bg-slate-100 text-slate-600" : undefined,
                      active ? "scale-105" : undefined,
                      !hasHandler ? "cursor-default" : !canClick ? "cursor-not-allowed opacity-75" : "cursor-pointer"
                    )}
                  >
                    {done ? <Check className="h-5 w-5" /> : s.id}
                  </button>
                </div>
                {idx < steps.length - 1 && (
                  <div key={`conn-${s.id}`} style={{ gridColumn: `${connCol} / span 1` }} className="justify-self-center">
                    <span
                      className={cn(
                        "h-0.5 rounded block",
                        connectorWidth,
                        done ? "bg-blue-600" : active ? "bg-gradient-to-r from-blue-500 to-indigo-600" : "bg-slate-200"
                      )}
                      aria-hidden
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Row 2: labels thẳng hàng dưới các circle cột lẻ */}
        <div
          className="mt-1 grid"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {steps.map((s, idx) => {
            const active = s.id === current;
            const circleCol = idx * 2 + 1;
            return (
              <div key={`label-${s.id}`} style={{ gridColumn: `${circleCol} / span 1` }} className="justify-self-center text-center">
                <span
                  className={cn(
                    size === "sm" ? "text-[13px]" : "text-sm",
                    active ? "font-semibold text-slate-900" : "font-medium text-slate-500",
                    "leading-5 h-5 whitespace-nowrap"
                  )}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
