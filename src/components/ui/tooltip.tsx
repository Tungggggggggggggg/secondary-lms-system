"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  placement?: "right" | "left" | "top" | "bottom";
  disabled?: boolean;
}

export default function Tooltip({ content, children, placement = "right", disabled = false }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const anchorRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    let top = rect.top + rect.height / 2;
    let left = rect.right;

    if (placement === "left") {
      left = rect.left;
    } else if (placement === "top") {
      top = rect.top;
      left = rect.left + rect.width / 2;
    } else if (placement === "bottom") {
      top = rect.bottom;
      left = rect.left + rect.width / 2;
    }

    setPos({ top, left });
  }, [open, placement]);

  const child = React.cloneElement(children, {
    ref: (node: HTMLElement) => {
      // @ts-ignore
      if (typeof children.ref === "function") children.ref(node);
      // @ts-ignore
      else if (children.ref) children.ref.current = node;
      anchorRef.current = node;
    },
    onMouseEnter: (e: React.MouseEvent) => {
      if (!disabled) setOpen(true);
      // @ts-ignore
      if (children.props.onMouseEnter) children.props.onMouseEnter(e);
    },
    onMouseLeave: (e: React.MouseEvent) => {
      setOpen(false);
      // @ts-ignore
      if (children.props.onMouseLeave) children.props.onMouseLeave(e);
    },
    onFocus: (e: React.FocusEvent) => {
      if (!disabled) setOpen(true);
      // @ts-ignore
      if (children.props.onFocus) children.props.onFocus(e);
    },
    onBlur: (e: React.FocusEvent) => {
      setOpen(false);
      // @ts-ignore
      if (children.props.onBlur) children.props.onBlur(e);
    },
    "aria-describedby": open ? "tooltip" : undefined,
  });

  return (
    <>
      {child}
      {open && pos && !disabled && typeof window !== "undefined"
        ? createPortal(
            <div
              id="tooltip"
              role="tooltip"
              className="pointer-events-none fixed z-[1000] select-none"
              style={{ top: pos.top, left: pos.left }}
            >
              <div className="translate-y-[-50%] ml-2 rounded-md bg-gray-900 px-2.5 py-1 text-xs text-white shadow-lg">
                {content}
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
