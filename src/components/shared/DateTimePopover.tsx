"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Calendar, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import CalendarGrid from "./CalendarGrid";
import TimeSegmentedInput from "./TimeSegmentedInput";

interface DateTimePopoverProps {
  label: string;
  value?: Date;
  onChange: (d: Date | undefined) => void;
  required?: boolean;
  className?: string;
  min?: Date;
  max?: Date;
  mode?: "popover" | "dialog";
}

function formatDateTime(d?: Date): string {
  if (!d) return "--";
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function DateTimePopover({ label, value, onChange, required, className, min, max, mode = "dialog" }: DateTimePopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempDate, setTempDate] = useState(value);

  useEffect(() => {
    if (isOpen) setTempDate(value);
  }, [isOpen, value]);

  // Keyboard shortcuts: Enter to confirm, Esc to cancel (a11y)
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleConfirm();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleCancel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, tempDate]);

  const handleConfirm = () => {
    if (tempDate) {
      onChange(tempDate);
      setIsOpen(false);
    }
  };

  const handleCancel = () => {
    setTempDate(value);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange(undefined);
    setTempDate(undefined);
    setIsOpen(false);
  };

  const withSameTime = (base: Date, d: Date) => {
    const h = base?.getHours?.() ?? 8;
    const m = base?.getMinutes?.() ?? 0;
    const nd = new Date(d);
    nd.setHours(h);
    nd.setMinutes(m);
    return nd;
  };

  const clampToBounds = (d?: Date) => {
    if (!d) return d;
    let nd = new Date(d);
    if (min && nd < min) nd = new Date(min);
    if (max && nd > max) nd = new Date(max);
    return nd;
  };

  const updateTemp = (d?: Date) => {
    setTempDate(clampToBounds(d));
  };

  const setToday = () => {
    const t = new Date();
    updateTemp(withSameTime(tempDate || t, t));
  };
  const setTomorrow = () => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    updateTemp(withSameTime(tempDate || t, t));
  };
  const setNextWeek = () => {
    const t = new Date();
    t.setDate(t.getDate() + 7);
    updateTemp(withSameTime(tempDate || t, t));
  };

  const TriggerButton = (
    <button
      type="button"
      onClick={() => setIsOpen(true)}
      className={cn(
        "w-full h-12 px-4 rounded-xl border-2 transition-all duration-200",
        "flex items-center justify-between",
        "bg-gradient-to-r from-white to-blue-50",
        "hover:border-blue-400 hover:shadow-lg hover:from-blue-50",
        isOpen ? "border-blue-500 shadow-xl from-blue-50 to-blue-100" : "border-gray-300",
        value ? "text-gray-800 font-medium" : "text-gray-500",
        "group"
      )}
    >
      <span className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-blue-600 group-hover:scale-110 transition-transform" />
        <span className="text-sm">{formatDateTime(value)}</span>
      </span>
      <Clock className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
    </button>
  );

  const PickerBody = (
    <div className="grid grid-rows-[auto,1fr,auto] max-h-[85vh] bg-white rounded-xl overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-10 p-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Calendar className="h-6 w-6 text-blue-600" />
            Chọn ngày và giờ
          </h3>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button 
            type="button" 
            size="sm" 
            variant="outline" 
            className="h-8 text-xs font-medium hover:bg-blue-100" 
            onClick={setToday}
          >
            Hôm nay
          </Button>
          <Button 
            type="button" 
            size="sm" 
            variant="outline" 
            className="h-8 text-xs font-medium hover:bg-blue-100" 
            onClick={setTomorrow}
          >
            Ngày mai
          </Button>
          <Button 
            type="button" 
            size="sm" 
            variant="outline" 
            className="h-8 text-xs font-medium hover:bg-blue-100" 
            onClick={setNextWeek}
          >
            Tuần tới
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="overflow-y-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Calendar */}
          <div>
            <CalendarGrid value={tempDate} onChange={updateTemp} minDate={min} maxDate={max} />
          </div>

          {/* Time & Validation */}
          <div className="flex flex-col gap-6">
            <TimeSegmentedInput value={tempDate} onChange={updateTemp} />
            
            {/* Selected DateTime Display */}
            {tempDate && (
              <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
                <p className="text-sm text-green-800 font-semibold flex items-center gap-2">
                  <span className="text-lg">✓</span>
                  {formatDateTime(tempDate)}
                </p>
              </div>
            )}

            {/* Validation Errors */}
            {tempDate && min && tempDate < min && (
              <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                <p className="text-xs text-red-700 font-medium">⚠ Thời gian phải sau {formatDateTime(min)}</p>
              </div>
            )}
            {tempDate && max && tempDate > max && (
              <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                <p className="text-xs text-red-700 font-medium">⚠ Thời gian phải trước {formatDateTime(max)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 z-10 p-5 border-t border-gray-200 bg-gray-50">
        <div className="flex gap-3">
          <Button 
            type="button" 
            variant="outline" 
            className="flex-1 h-11 font-medium" 
            onClick={handleCancel}
          >
            Hủy
          </Button>
          <Button
            type="button"
            className="flex-1 h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 font-medium text-white shadow-md hover:shadow-lg transition-all"
            onClick={handleConfirm}
            disabled={!tempDate || (min && !!tempDate && tempDate < min) || (max && !!tempDate && tempDate > max)}
          >
            ✓ Xác nhận
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        {value && (
          <Button
            type="button"
            variant="ghost"
            className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
            onClick={handleClear}
          >
            <X className="h-3 w-3 mr-1" />
            Xóa
          </Button>
        )}
      </div>

      {mode === "dialog" ? (
        <>
          {TriggerButton}
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="md:w-[880px] w-[420px] max-h-[85vh] p-0" onClose={() => setIsOpen(false)}>
              {PickerBody}
            </DialogContent>
          </Dialog>
        </>
      ) : (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>{TriggerButton}</PopoverTrigger>
          <PopoverContent
            side="bottom"
            align="start"
            collisionPadding={16}
            className="md:w-[880px] w-[420px] max-h-[80vh] p-0 border-2 border-blue-200 rounded-xl shadow-xl z-[60]"
          >
            {PickerBody}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
