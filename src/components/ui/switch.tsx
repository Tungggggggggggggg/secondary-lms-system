"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, checked, onCheckedChange, onChange, disabled, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onCheckedChange?.(e.target.checked)
      onChange?.(e)
    }

    return (
      <label className={cn("relative inline-flex items-center", disabled ? "cursor-not-allowed" : "cursor-pointer")}>        
        <input
          type="checkbox"
          role="switch"
          aria-checked={!!checked}
          className={cn("sr-only peer", disabled ? "pointer-events-none" : "")}
          ref={ref}
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
          {...props}
        />
        <div
          className={cn(
            "relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out",
            "bg-gray-300 peer-checked:bg-blue-600 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-blue-400",
            "after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:shadow",
            "after:transition-transform after:duration-200 after:ease-in-out peer-checked:after:translate-x-5",
            "peer-disabled:opacity-50",
            className
          )}
        />
      </label>
    )
  }
)
Switch.displayName = "Switch"

export { Switch }
