"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface DropdownMenuProps {
  children: React.ReactNode;
}

type Ctx = { open: boolean; setOpen: (v: boolean) => void; rootRef: React.RefObject<HTMLDivElement> };
const DropdownCtx = React.createContext<Ctx | null>(null);

export function DropdownMenu({ children }: DropdownMenuProps) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const root = rootRef.current;
      if (!root) return;
      const target = e.target as HTMLElement;
      if (!root.contains(target)) setOpen(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const ctx: Ctx = React.useMemo(() => ({ open, setOpen, rootRef }), [open]);
  return (
    <DropdownCtx.Provider value={ctx}>
      <div ref={rootRef} className="relative inline-block text-left">{children}</div>
    </DropdownCtx.Provider>
  );
}

interface DropdownMenuTriggerProps {
  asChild?: boolean;
  children: React.ReactElement;
}

export function DropdownMenuTrigger({ asChild, children }: DropdownMenuTriggerProps) {
  const ctx = React.useContext(DropdownCtx)!;
  return React.cloneElement(children, {
    "data-dropdown-trigger": true,
    onClick: (e: any) => {
      e.stopPropagation();
      ctx.setOpen(!ctx.open);
      if (typeof children.props.onClick === "function") children.props.onClick(e);
    },
    "aria-haspopup": "menu",
    "aria-expanded": ctx.open,
  });
}

interface DropdownMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: "start" | "end" | "center";
}

export function DropdownMenuContent({ className, align = "start", ...props }: DropdownMenuContentProps) {
  const alignClass = align === "end" ? "right-0" : align === "center" ? "left-1/2 -translate-x-1/2" : "left-0";
  const ctx = React.useContext(DropdownCtx)!;
  if (!ctx.open) return null;
  return (
    <div
      data-dropdown-content
      className={cn(
        "absolute z-50 mt-2 min-w-[10rem] origin-top rounded-xl border border-gray-200 bg-white p-1 shadow-lg focus:outline-none",
        alignClass,
        className
      )}
      {...props}
    />
  );
}

export function DropdownMenuLabel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-2 py-1.5 text-xs font-semibold text-gray-500", className)} {...props} />;
}

export function DropdownMenuSeparator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("my-1 h-px bg-gray-200", className)} {...props} />;
}

export function DropdownMenuItem({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex cursor-pointer select-none items-center rounded-lg px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50",
        className
      )}
      role="menuitem"
      {...props}
    />
  );
}

