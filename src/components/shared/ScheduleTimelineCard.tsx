"use client";

import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ScheduleTimelineCardProps {
  openAt?: Date;
  lockAt?: Date;
  timeLimitMinutes: number;
  onFixDuration?: () => void;
  className?: string;
}

function formatTime(d?: Date): string {
  if (!d) return "--";
  return d.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(d?: Date): string {
  if (!d) return "--";
  return d.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatDuration(ms: number): string {
  if (ms <= 0) return "0 phút";
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export default function ScheduleTimelineCard({
  openAt,
  lockAt,
  timeLimitMinutes,
  onFixDuration,
  className
}: ScheduleTimelineCardProps) {
  const durationMs = useMemo(() => {
    if (!openAt || !lockAt) return 0;
    return lockAt.getTime() - openAt.getTime();
  }, [openAt, lockAt]);

  const durationText = formatDuration(durationMs);
  const durationMinutes = Math.round(durationMs / 60000);

  const invalidOrder = !!(openAt && lockAt && openAt >= lockAt);
  const notEnoughDuration = durationMinutes > 0 && durationMinutes < timeLimitMinutes;

  // Timeline percentage
  const timelinePercent = durationMinutes > 0 ? Math.min(100, (timeLimitMinutes / durationMinutes) * 100) : 0;

  return (
    <Card className={cn("bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 shadow-md", className)}>
      <CardContent className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-bold text-gray-800">Lịch trình thi</h3>
          </div>
          {openAt && lockAt && (
            <div className="text-xs font-medium text-blue-700 bg-blue-100 px-3 py-1 rounded-full">
              {durationText}
            </div>
          )}
        </div>

        {/* Timeline Visual */}
        {openAt && lockAt && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span className="font-medium">Khoảng thời gian</span>
              <span>{durationText}</span>
            </div>
            <div className="relative h-8 bg-white rounded-lg border-2 border-gray-200 overflow-hidden">
              {/* Timeline bar */}
              <div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-400 to-indigo-500 transition-all duration-300"
                style={{ width: `${timelinePercent}%` }}
              />
              {/* Markers */}
              <div className="absolute top-0 left-0 h-full flex items-center justify-between px-2 pointer-events-none">
                <div className="w-1 h-full bg-blue-600 rounded-full shadow-md" />
                <div className="w-1 h-full bg-indigo-600 rounded-full shadow-md" />
              </div>
              {/* Duration label */}
              {timelinePercent > 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                  {timeLimitMinutes}m
                </div>
              )}
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-white rounded-lg border border-gray-200">
          <div>
            <div className="text-xs text-gray-600 font-medium mb-1">Mở bài</div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-semibold text-gray-800">{formatDate(openAt)}</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-semibold text-gray-800">{formatTime(openAt)}</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-600 font-medium mb-1">Đóng bài</div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-semibold text-gray-800">{formatDate(lockAt)}</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-semibold text-gray-800">{formatTime(lockAt)}</span>
            </div>
          </div>
        </div>

        {/* Validation Alerts */}
        {invalidOrder && (
          <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <span className="text-sm text-red-700">Thời gian mở bài phải trước thời gian đóng bài</span>
          </div>
        )}

        {notEnoughDuration && (
          <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <span className="text-sm text-amber-800">
                Thời lượng ({timeLimitMinutes}m) vượt quá khoảng thời gian ({durationMinutes}m)
              </span>
            </div>
            {onFixDuration && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="text-xs h-8 ml-2"
                onClick={onFixDuration}
              >
                Sửa nhanh
              </Button>
            )}
          </div>
        )}

        {/* Empty State */}
        {!openAt && !lockAt && (
          <div className="text-center py-6 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">Chưa chọn lịch trình. Hãy chọn thời gian mở và đóng bài.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
