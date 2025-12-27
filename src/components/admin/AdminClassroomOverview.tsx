"use client";

import Button from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Badge from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { BookOpen, IdCard, Users as UsersIcon } from "lucide-react";

interface AdminClassroomOverviewProps {
  name: string;
  code: string;
  maxStudents: number;
  studentCount: number;
  isActive: boolean;
  teacherName?: string | null;
  teacherEmail?: string | null;
  onExportStudents?: () => void;
  onToggleArchive?: () => void;
  onEdit?: () => void;
  onChangeTeacher?: () => void;
  onBulkAddStudents?: () => void;
  onForceDelete?: () => void;
  isArchived?: boolean;
  forceDeleting?: boolean;
}

export default function AdminClassroomOverview({
  name,
  code,
  maxStudents,
  studentCount,
  isActive,
  teacherName,
  teacherEmail,
  onExportStudents,
  onToggleArchive,
  onEdit,
  onChangeTeacher,
  onBulkAddStudents,
  onForceDelete,
  isArchived,
  forceDeleting,
}: AdminClassroomOverviewProps) {
  const archived = isArchived ?? !isActive;
  const teacherInitial = (teacherName || teacherEmail || "?")
    .toString()
    .trim()
    .charAt(0)
    .toUpperCase() || "?";

  return (
    <Card className="p-6 sm:p-7 space-y-5 rounded-2xl border border-border/80 bg-gradient-to-br from-background via-background to-indigo-50/20 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-semibold sm:font-bold tracking-tight text-foreground truncate">
              {name}
            </h2>
            <Badge
              variant="outline"
              className="border-indigo-200 bg-indigo-50/80 text-[11px] font-mono text-indigo-700"
            >
              Mã lớp: {code}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <Badge variant={isActive ? "success" : "destructive"}>
              {isActive ? "Hoạt động" : "Đã lưu trữ"}
            </Badge>
            <Badge variant="outline" className="border-slate-200 bg-white/80 text-slate-700">
              {studentCount} / {maxStudents} học sinh
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/90 px-3 py-2 min-w-[220px]">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 via-indigo-400 to-sky-500 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(15,23,42,0.45)]">
            <span>{teacherInitial}</span>
          </div>
          <div className="space-y-0.5 min-w-0">
            <div className="text-xs font-semibold text-foreground truncate">
              {teacherName || "(Chưa cập nhật)"}
            </div>
            <div className="text-[11px] text-muted-foreground truncate">{teacherEmail || "—"}</div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-600">
              Giáo viên phụ trách
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3 text-sm">
        <InfoCard icon={BookOpen} label="Tên lớp" value={name} />
        <InfoCard icon={IdCard} label="Mã lớp" value={code} mono />
        <InfoCard icon={UsersIcon} label="Sĩ số tối đa" value={String(maxStudents)} />
      </div>

      {archived ? (
        <Alert className="rounded-2xl border-amber-200 bg-amber-50/80">
          <AlertDescription className="text-[11px] text-amber-900">
            Lớp đã lưu trữ: cho phép xem, export, khôi phục hoặc xóa vĩnh viễn.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap gap-2 sm:items-center sm:justify-end">
        {onBulkAddStudents ? (
          <Button
            type="button"
            size="sm"
            variant="primary"
            color="blue"
            onClick={onBulkAddStudents}
            disabled={archived}
            className="transition-all active:scale-95 active:translate-y-[1px]"
          >
            Thêm HS
          </Button>
        ) : null}
        {onEdit ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            color="slate"
            onClick={onEdit}
            disabled={archived}
            className="transition-all active:scale-95 active:translate-y-[1px]"
          >
            Sửa lớp
          </Button>
        ) : null}
        {onChangeTeacher ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            color="slate"
            onClick={onChangeTeacher}
            disabled={archived}
            className="transition-all active:scale-95 active:translate-y-[1px]"
          >
            Đổi GV
          </Button>
        ) : null}
        {onExportStudents ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            color="slate"
            onClick={onExportStudents}
            className="transition-all active:scale-95 active:translate-y-[1px]"
          >
            Xuất Excel
          </Button>
        ) : null}
        {onToggleArchive ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            color="slate"
            onClick={onToggleArchive}
            className={cn(
              "border-amber-200 text-amber-700 hover:bg-amber-50 transition-all active:scale-95 active:translate-y-[1px]",
              isActive ? "" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            )}
          >
            {isActive ? "Lưu trữ" : "Khôi phục"}
          </Button>
        ) : null}
        {onForceDelete ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            color="slate"
            onClick={onForceDelete}
            disabled={!archived || forceDeleting}
            className="border-destructive/20 text-destructive/90 hover:bg-destructive/5 transition-all active:scale-95 active:translate-y-[1px]"
          >
            {forceDeleting ? "Đang xóa..." : "Xóa vĩnh viễn"}
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: typeof BookOpen;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-background/90 px-4 py-3 shadow-sm">
      <div className="pointer-events-none absolute -right-4 -top-4 h-12 w-12 rounded-full bg-indigo-500/5" />
      <div className="pointer-events-none absolute -right-8 bottom-0 h-16 w-16 rounded-full bg-indigo-500/8" />
      <div className="relative flex items-center justify-between gap-3">
        <div className="space-y-0.5 min-w-0">
          <div className="text-[11px] text-muted-foreground">{label}</div>
          <div
            className={cn(
              "text-sm sm:text-base font-semibold text-foreground truncate",
              mono ? "font-mono tracking-tight" : ""
            )}
          >
            {value}
          </div>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-600">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}
