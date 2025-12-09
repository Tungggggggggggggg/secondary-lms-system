"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}

export default function FormField({ label, htmlFor, required, hint, error, className, children }: FormFieldProps) {
  const describedById = error ? `${htmlFor || label}-error` : hint ? `${htmlFor || label}-hint` : undefined;
  return (
    <div className={cn("space-y-2", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-slate-900">
        {label}{required && <span className="text-red-600 font-bold"> *</span>}
      </label>
      {React.isValidElement(children)
        ? React.cloneElement(children as any, {
            "aria-invalid": error ? true : undefined,
            "aria-describedby": describedById,
          })
        : children}
      {hint && !error && (
        <p id={describedById} className="text-xs text-slate-500">{hint}</p>
      )}
      {error && (
        <p id={describedById} className="text-xs text-red-600 font-medium">{error}</p>
      )}
    </div>
  );
}
