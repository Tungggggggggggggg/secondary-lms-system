"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

interface AccordionItemProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
}

export function AccordionItem({ title, defaultOpen = true, children, className, headerClassName, contentClassName }: AccordionItemProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between text-left text-[13px] font-semibold px-3 py-2 rounded-md transition-colors duration-200 ease-out ${headerClassName ?? "text-gray-700 hover:bg-gray-50"}`}
      >
        <span className="uppercase tracking-wide">{title}</span>
        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ease-out ${open ? "rotate-180" : "rotate-0"}`} />
      </button>
      <div className={`overflow-hidden transition-[max-height] duration-300 ease-out ${open ? "max-h-[1000px]" : "max-h-0"}`}>
        <div className={`mt-1 space-y-1 ${contentClassName ?? ""}`}>{children}</div>
      </div>
    </div>
  );
}
