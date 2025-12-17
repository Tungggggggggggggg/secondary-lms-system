"use client";

import Button from "@/components/ui/button";

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

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1 min-w-0">
          <h2 className="text-base font-semibold text-slate-900 truncate">{name}</h2>
          <div className="text-xs text-slate-600">
            Mã lớp: <span className="font-semibold text-slate-900">{code}</span>
          </div>

          <div className="mt-3 space-y-0.5">
            <div className="text-[11px] text-slate-500">Giáo viên phụ trách</div>
            <div className="text-sm font-semibold text-slate-900">
              {teacherName || "(Chưa cập nhật)"}
            </div>
            <div className="text-xs text-slate-600">{teacherEmail || "—"}</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 md:justify-end">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${
              isActive
                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                : "bg-slate-100 text-slate-700 border-slate-200"
            }`}
          >
            {isActive ? "Hoạt động" : "Đã lưu trữ"}
          </span>
          <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border border-slate-200 text-slate-700">
            {studentCount} / {maxStudents} học sinh
          </span>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3 text-sm">
        <div className="rounded-xl border border-slate-100 p-4">
          <div className="text-[11px] text-slate-500">Tên lớp</div>
          <div className="text-sm font-semibold text-slate-900 truncate">{name}</div>
        </div>
        <div className="rounded-xl border border-slate-100 p-4">
          <div className="text-[11px] text-slate-500">Mã lớp</div>
          <div className="text-sm font-semibold text-slate-900 truncate">{code}</div>
        </div>
        <div className="rounded-xl border border-slate-100 p-4">
          <div className="text-[11px] text-slate-500">Sĩ số tối đa</div>
          <div className="text-sm font-semibold text-slate-900">{maxStudents}</div>
        </div>
      </div>

      {archived && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-700">
          Lớp đã lưu trữ: cho phép xem, export, khôi phục hoặc xóa vĩnh viễn.
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end">
        {onExportStudents ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            color="slate"
            onClick={onExportStudents}
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
          >
            {isActive ? "Lưu trữ" : "Khôi phục"}
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
          >
            Đổi GV
          </Button>
        ) : null}
        {onBulkAddStudents ? (
          <Button type="button" size="sm" onClick={onBulkAddStudents} disabled={archived}>
            Thêm HS
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
            className="border-red-200 text-red-700 hover:bg-red-50"
          >
            {forceDeleting ? "Đang xóa..." : "Xóa vĩnh viễn"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
