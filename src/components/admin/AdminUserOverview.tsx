"use client";

import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { CalendarClock, Clock3, ShieldCheck } from "lucide-react";

interface AdminUserOverviewProps {
  email: string;
  fullname: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  roleSelectedAt: string | null;
  isDisabled: boolean;
  disabledReason?: string | null;
  teacherClassrooms: number;
  studentEnrollments: number;
  parentRelations: number;
  actions?: ReactNode;
}

const roleBadgeTone: Record<string, string> = {
  TEACHER: "border-blue-200 bg-blue-50 text-blue-800",
  STUDENT: "border-emerald-200 bg-emerald-50 text-emerald-800",
  PARENT: "border-amber-200 bg-amber-50 text-amber-900",
};

export default function AdminUserOverview({
  email,
  fullname,
  role,
  createdAt,
  updatedAt,
  roleSelectedAt,
  isDisabled,
  disabledReason,
  teacherClassrooms,
  studentEnrollments,
  parentRelations,
  actions,
}: AdminUserOverviewProps) {
  const safeFullname = fullname || "(Chưa cập nhật)";
  const normalizedRole = role.toUpperCase();

  return (
    <div className="space-y-4">
      <Card className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-background via-background to-indigo-50/40 p-5 sm:p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="relative flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 via-indigo-400 to-sky-500 text-base sm:text-lg font-semibold text-white shadow-[0_10px_30px_rgba(15,23,42,0.45)]">
              <span>{safeFullname.charAt(0).toUpperCase()}</span>
            </div>
            <div className="space-y-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-semibold sm:font-bold tracking-tight text-foreground truncate">
                {safeFullname}
              </h2>
              <div className="text-xs text-muted-foreground truncate" title={email}>
                {email}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                <Badge
                  variant="outline"
                  className={cn(
                    "uppercase tracking-wide",
                    roleBadgeTone[normalizedRole] ?? ""
                  )}
                >
                  {role}
                </Badge>
                <Badge variant={isDisabled ? "destructive" : "success"}>
                  {isDisabled ? "Đã khoá" : "Hoạt động"}
                </Badge>
              </div>
            </div>
          </div>
          {actions ? <div className="shrink-0 flex flex-col items-end gap-2">{actions}</div> : null}
        </div>

        {isDisabled ? (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription className="text-[11px]">
              {disabledReason || "Không có lý do cụ thể"}
            </AlertDescription>
          </Alert>
        ) : null}
      </Card>

      <Card className="rounded-2xl border border-border/70 bg-background/90 p-5 space-y-3 shadow-sm">
        <div className="text-[11px] font-semibold text-muted-foreground tracking-[0.18em] uppercase">
          Thông tin hệ thống
        </div>
        <div className="space-y-2 text-[12px] text-foreground/80">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5" />
              <span>Ngày tạo</span>
            </div>
            <span className="text-[11px] text-foreground/80">{createdAt}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock3 className="h-3.5 w-3.5" />
              <span>Cập nhật gần nhất</span>
            </div>
            <span className="text-[11px] text-foreground/80">{updatedAt}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Thời điểm chọn role</span>
            </div>
            <span className="text-[11px] text-foreground/80">{roleSelectedAt || "—"}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
