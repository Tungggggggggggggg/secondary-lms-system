"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { BookOpen, ChevronRight, Calendar } from "lucide-react";

interface ClassCardProps {
  id: string;
  name: string;
  icon?: ReactNode;
  teacherName: string;
  studentCount: number;
  joinedAt?: string | Date;
  compact?: boolean;
}

export default function ClassCard({
  id,
  name,
  icon,
  teacherName,
  studentCount,
  joinedAt,
  compact = false,
}: ClassCardProps) {
  if (compact) {
    return (
      <Link href={`/dashboard/student/classes/${id}`} className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
        <div className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-green-300 hover:bg-green-50/30 transition-all duration-200 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-green-400 via-emerald-400 to-teal-300 flex-shrink-0 text-white">
            {typeof icon === "string" || !icon ? (
              <BookOpen className="h-5 w-5 sm:h-6 sm:w-6" />
            ) : (
              icon
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground truncate group-hover:text-green-700 transition-colors">
              {name}
            </p>
            <p className="text-xs text-muted-foreground truncate">GV: {teacherName}</p>
          </div>
          <span className="text-xs font-semibold text-green-600 group-hover:text-green-700 whitespace-nowrap inline-flex items-center">
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/dashboard/student/classes/${id}`}
      className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="flex flex-col sm:flex-row items-stretch gap-4 rounded-2xl bg-card/95 border border-border shadow-[0_8px_24px_rgba(15,23,42,0.06)] px-5 py-4 sm:px-6 sm:py-5 transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(15,23,42,0.12)]">
        <div className="flex items-center sm:items-start gap-3 sm:gap-4 flex-shrink-0">
          <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-green-400 via-emerald-400 to-teal-300 text-white shadow-sm">
            <div className="h-6 w-6 sm:h-7 sm:w-7">
              {typeof icon === "string" || !icon ? (
                <BookOpen className="h-5 w-5 sm:h-6 sm:w-6" />
              ) : (
                icon
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-between gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-bold text-foreground line-clamp-2 group-hover:text-green-700 transition-colors">
                {name}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                GV: {teacherName || "Giáo viên"}
              </p>
            </div>
            <div className="text-right space-y-1">
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700 border border-emerald-100">
                Đang học
              </span>
              <div className="text-[11px] text-muted-foreground">
                {studentCount} học sinh
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 text-[11px] sm:text-xs text-muted-foreground">
            <div className="flex flex-wrap items-center gap-2">
              {joinedAt && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground border border-border">
                  <Calendar className="h-3 w-3" />
                  <span>{new Date(joinedAt).toLocaleDateString("vi-VN")}</span>
                </span>
              )}
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-green-600 group-hover:text-green-700 whitespace-nowrap shrink-0">
              Vào lớp
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
