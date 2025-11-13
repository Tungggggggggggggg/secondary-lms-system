"use client";

import React, { useState, useEffect, useId } from 'react';
import { Calendar as CalendarIcon, Clock, AlertCircle, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface DateTimePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  label?: string;
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  className?: string;
  error?: string;
  required?: boolean;
}

export function DateTimePicker({
  value,
  onChange,
  label,
  placeholder = "Chọn ngày và giờ",
  minDate,
  maxDate,
  disabled = false,
  className,
  error,
  required = false
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(value);
  const [tempDate, setTempDate] = useState<Date>(value || new Date());

  // Validation - không cho chọn thời gian quá khứ
  const now = new Date();
  const isInPast = selectedDate && selectedDate < now;

  useEffect(() => {
    if (value) {
      setSelectedDate(value);
      setTempDate(value);
    }
  }, [value]);

  const formatDisplayValue = () => {
    if (!selectedDate) return placeholder;
    return selectedDate.toLocaleDateString('vi-VN', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDateChange = (field: 'year' | 'month' | 'day', value: number) => {
    const newDate = new Date(tempDate);
    if (field === 'year') newDate.setFullYear(value);
    if (field === 'month') newDate.setMonth(value);
    if (field === 'day') newDate.setDate(value);
    setTempDate(newDate);
  };

  const handleTimeChange = (field: 'hour' | 'minute', value: number) => {
    const newDate = new Date(tempDate);
    if (field === 'hour') newDate.setHours(value);
    if (field === 'minute') newDate.setMinutes(value);
    setTempDate(newDate);
  };

  const handleConfirm = () => {
    // Kiểm tra nếu thời gian là quá khứ
    if (tempDate < now) {
      return; // Không cho phép
    }
    
    setSelectedDate(tempDate);
    onChange(tempDate);
    setIsOpen(false);
  };

  const getValidationMessage = () => {
    if (error) return error;
    if (isInPast) return "Không thể chọn thời gian trong quá khứ";
    return null;
  };

  const hasError = !!(error || isInPast);

  // Generate options
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear + i);
  const months = Array.from({ length: 12 }, (_, i) => i);
  const monthNames = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
  ];
  const daysInMonth = new Date(tempDate.getFullYear(), tempDate.getMonth() + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  return (
    <div className={cn("space-y-2 relative", className)}>
      {label && (
        <Label className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      
      {/* Main Input - Custom Styled */}
      <div
        className={cn(
          "w-full h-12 px-4 pr-12 border-2 rounded-lg cursor-pointer",
          "bg-gradient-to-r from-white to-blue-50 shadow-sm transition-all duration-200",
          "text-base font-medium flex items-center",
          "hover:border-blue-400 hover:shadow-md hover:from-blue-50 hover:to-blue-100",
          {
            "border-red-500 bg-red-50": hasError,
            "opacity-50 cursor-not-allowed": disabled,
            "border-blue-500 shadow-lg from-blue-100 to-blue-200": isOpen,
            "border-gray-300": !hasError && !isOpen
          }
        )}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className={cn(
          "flex-1",
          { "text-gray-500": !selectedDate, "text-gray-800 font-semibold": selectedDate }
        )}>
          {formatDisplayValue()}
        </span>
        
        {/* Icons */}
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-blue-500" />
          <Clock className="h-4 w-4 text-gray-400" />
          <ChevronDown className={cn(
            "h-4 w-4 text-gray-400 transition-transform duration-200",
            { "rotate-180": isOpen }
          )} />
        </div>
      </div>

      {/* Custom Dropdown - NO NATIVE PICKER */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-blue-200 rounded-xl shadow-2xl z-50">
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="text-center border-b pb-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center justify-center gap-2">
                <CalendarIcon className="h-5 w-5 text-blue-500" />
                Chọn ngày và giờ
              </h3>
              <p className="text-sm text-gray-500 mt-1">Thiết lập thời gian chính xác</p>
            </div>

            {/* Date Selection */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-700 flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Ngày
              </h4>
              <div className="grid grid-cols-3 gap-3">
                {/* Day */}
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">Ngày</Label>
                  <select
                    value={tempDate.getDate()}
                    onChange={(e) => handleDateChange('day', parseInt(e.target.value))}
                    className="w-full p-2 border-2 rounded-lg text-sm hover:border-blue-300 focus:border-blue-500 focus:outline-none"
                  >
                    {days.map(day => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                </div>

                {/* Month */}
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">Tháng</Label>
                  <select
                    value={tempDate.getMonth()}
                    onChange={(e) => handleDateChange('month', parseInt(e.target.value))}
                    className="w-full p-2 border-2 rounded-lg text-sm hover:border-blue-300 focus:border-blue-500 focus:outline-none"
                  >
                    {months.map(month => (
                      <option key={month} value={month}>{monthNames[month]}</option>
                    ))}
                  </select>
                </div>

                {/* Year */}
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">Năm</Label>
                  <select
                    value={tempDate.getFullYear()}
                    onChange={(e) => handleDateChange('year', parseInt(e.target.value))}
                    className="w-full p-2 border-2 rounded-lg text-sm hover:border-blue-300 focus:border-blue-500 focus:outline-none"
                  >
                    {years.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Time Selection */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-700 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Giờ
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {/* Hour */}
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">Giờ</Label>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={tempDate.getHours()}
                    onChange={(e) => {
                      const hour = parseInt(e.target.value);
                      if (hour >= 0 && hour <= 23) {
                        handleTimeChange('hour', hour);
                      }
                    }}
                    className="w-full p-2 border-2 rounded-lg text-sm font-mono hover:border-blue-300 focus:border-blue-500 focus:outline-none text-center"
                    placeholder="00"
                  />
                </div>

                {/* Minute */}
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">Phút</Label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={tempDate.getMinutes()}
                    onChange={(e) => {
                      const minute = parseInt(e.target.value);
                      if (minute >= 0 && minute <= 59) {
                        handleTimeChange('minute', minute);
                      }
                    }}
                    className="w-full p-2 border-2 rounded-lg text-sm font-mono hover:border-blue-300 focus:border-blue-500 focus:outline-none text-center"
                    placeholder="00"
                  />
                </div>
              </div>
            </div>


            {/* Validation Warning */}
            {tempDate < now && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200 animate-pulse">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm font-medium">⚠️ Không thể chọn thời gian trong quá khứ</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="flex-1 hover:bg-gray-100"
              >
                Hủy
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={tempDate < now}
                className={cn(
                  "flex-1",
                  tempDate < now 
                    ? "bg-gray-400 cursor-not-allowed" 
                    : "bg-blue-600 hover:bg-blue-700"
                )}
              >
                ✓ Xác nhận
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Error Message */}
      {getValidationMessage() && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{getValidationMessage()}</span>
        </div>
      )}
      
      {/* Success Message */}
      {!hasError && selectedDate && (
        <div className="text-sm text-green-600 bg-green-50 p-3 rounded-lg border border-green-200">
          ✅ Đã chọn: {selectedDate.toLocaleDateString('vi-VN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      )}
    </div>
  );
}